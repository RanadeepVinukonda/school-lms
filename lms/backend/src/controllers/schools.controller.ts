import { Request, Response } from 'express';
import { getCollection } from '../database/adapter';
import { NotFoundError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

export async function createSchool(req: Request, res: Response) {
  const { name, subdomain, logo_url, primary_color, plan } = req.body;
  const ref = await getCollection('schools').add({ name, subdomain, logo_url, primary_color, plan });
  sendSuccess(res, { id: ref.id, name, subdomain }, undefined, 201);
}

export async function getSchool(req: Request, res: Response) {
  const snap = await getCollection('schools').doc(req.params.id).get();
  if (!snap.exists) throw new NotFoundError('School not found');
  sendSuccess(res, snap.data());
}

export async function updateSchool(req: Request, res: Response) {
  const ref = getCollection('schools').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) throw new NotFoundError('School not found');
  await ref.update(req.body);
  sendSuccess(res, { id: req.params.id });
}

export async function getBranding(req: Request, res: Response) {
  const snap = await getCollection('schools').doc(req.params.id).get();
  if (!snap.exists) throw new NotFoundError('School not found');
  const data = snap.data() as Record<string, unknown>;
  sendSuccess(res, {
    logo_url: data.logo_url,
    primary_color: data.primary_color,
    name: data.name,
  });
}

export async function updateBranding(req: Request, res: Response) {
  const ref = getCollection('schools').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) throw new NotFoundError('School not found');
  const { logo_url, primary_color } = req.body;
  await ref.update({ logo_url, primary_color });
  sendSuccess(res, { id: req.params.id });
}
