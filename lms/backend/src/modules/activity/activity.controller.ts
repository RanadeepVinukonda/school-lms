import { collections } from '../../firebase/firestore';
import { sendSuccess, buildPaginationMeta } from '../../utils/response';
import { parsePagination, paginateQuery } from '../../utils/pagination';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const getActivityLogs = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  let query = collections.activityLogs.orderBy('createdAt', 'desc');
  if (req.query.type) query = query.where('type', '==', req.query.type);
  if (req.query.userId) query = query.where('createdBy', '==', req.query.userId);
  const result = await paginateQuery(query, pagination);
  sendSuccess(res, 'Activity logs retrieved', {
    activities: result.data,
    pagination: buildPaginationMeta(result.total, pagination),
  });
});

export const getMyActivity = asyncHandler(async (req: AuthRequest, res) => {
  const pagination = parsePagination(req.query);
  let query = collections.activityLogs
    .where('createdBy', '==', req.user!.id)
    .orderBy('createdAt', 'desc');
  if (req.query.type) query = query.where('type', '==', req.query.type);
  const result = await paginateQuery(query, pagination);
  sendSuccess(res, 'My activity retrieved', {
    activities: result.data,
    pagination: buildPaginationMeta(result.total, pagination),
  });
});
