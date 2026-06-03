
import { collections } from "../../firebase/firestore";
import { NotFoundError } from "../../utils/errors";
import { sendSuccess, sendCreated, sendNoContent, buildPaginationMeta } from "../../utils/response";
import { parsePagination, paginateQuery } from "../../utils/pagination";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { Timestamp } from "firebase-admin/firestore";

export const listAnnouncements = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  let query = collections.activityLogs
    .where("type", "==", "announcement")
    .orderBy("createdAt", "desc");
  const result = await paginateQuery(query, pagination);
  sendSuccess(res, "Announcements retrieved", {
    announcements: result.data,
    pagination: buildPaginationMeta(result.total, pagination),
  });
});

export const getAnnouncementById = asyncHandler(async (req, res) => {
  const doc = await collections.activityLogs.doc(req.params.id).get();
  if (!doc.exists) throw new NotFoundError("Announcement not found");
  sendSuccess(res, "Announcement retrieved", { id: doc.id, ...doc.data() });
});

export const createAnnouncement = asyncHandler(async (req: AuthRequest, res) => {
  const data = {
    ...req.body,
    type: "announcement",
    createdBy: req.user!.id,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  const docRef = await collections.activityLogs.add(data);
  const doc = await docRef.get();
  sendCreated(res, "Announcement created", { id: docRef.id, ...doc.data() });
});

export const updateAnnouncement = asyncHandler(async (req, res) => {
  const doc = await collections.activityLogs.doc(req.params.id).get();
  if (!doc.exists) throw new NotFoundError("Announcement not found");
  await collections.activityLogs.doc(req.params.id).update({
    ...req.body,
    updatedAt: Timestamp.now(),
  });
  const updated = await collections.activityLogs.doc(req.params.id).get();
  sendSuccess(res, "Announcement updated", { id: req.params.id, ...updated.data() });
});

export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const doc = await collections.activityLogs.doc(req.params.id).get();
  if (!doc.exists) throw new NotFoundError("Announcement not found");
  await collections.activityLogs.doc(req.params.id).delete();
  sendNoContent(res);
});

