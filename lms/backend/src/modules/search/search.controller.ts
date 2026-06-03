
import { collections } from "../../firebase/firestore";
import { sendSuccess } from "../../utils/response";
import { asyncHandler } from "../../middlewares/asyncHandler";

export const search = asyncHandler(async (req, res) => {
  const { q, type, limit: limitStr } = req.query;
  const query = String(q ?? "");
  const searchType = String(type ?? "all");
  const limit = Math.min(Number(limitStr) || 20, 50);

  if (!query.trim()) {
    sendSuccess(res, "Search results", { results: [] });
    return;
  }

  const results: Record<string, unknown>[] = [];

  if (searchType === "all" || searchType === "courses") {
    const snapshot = await collections.courses
      .where("title", ">=", query)
      .where("title", "<=", query + "\uf8ff")
      .limit(limit).get();
    snapshot.docs.forEach((doc) => results.push({ type: "course", id: doc.id, ...doc.data() }));
  }

  if (searchType === "all" || searchType === "users") {
    const snapshot = await collections.users
      .where("displayName", ">=", query)
      .where("displayName", "<=", query + "\uf8ff")
      .limit(limit).get();
    snapshot.docs.forEach((doc) => results.push({ type: "user", id: doc.id, ...doc.data() }));
  }

  if (searchType === "all" || searchType === "lessons") {
    const snapshot = await collections.lessons
      .where("title", ">=", query)
      .where("title", "<=", query + "\uf8ff")
      .limit(limit).get();
    snapshot.docs.forEach((doc) => results.push({ type: "lesson", id: doc.id, ...doc.data() }));
  }

  if (searchType === "all" || searchType === "assignments") {
    const snapshot = await collections.assignments
      .where("title", ">=", query)
      .where("title", "<=", query + "\uf8ff")
      .limit(limit).get();
    snapshot.docs.forEach((doc) => results.push({ type: "assignment", id: doc.id, ...doc.data() }));
  }

  sendSuccess(res, "Search results", { results, query, type: searchType });
});

