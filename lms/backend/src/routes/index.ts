import { Router } from 'express';
import authRoutes from './auth';
import schoolRoutes from './school';
import financeRoutes from './finance';
import academicsRoutes from './academics';
import hrRoutes from './hr';
import contentRoutes from './content';
import infrastructureRoutes from './infrastructure';

const router = Router();

router.use('/auth', authRoutes);
router.use('/', schoolRoutes);
router.use('/', financeRoutes);
router.use('/', academicsRoutes);
router.use('/', hrRoutes);
router.use('/', contentRoutes);
router.use('/', infrastructureRoutes);

// ponytail: glob auto-discovery for future modules — uncomment when new module dir added
// import { readdirSync } from 'fs';
// import { join } from 'path';
// const moduleDirs = readdirSync(__dirname, { withFileTypes: true })
//   .filter(d => d.isDirectory() && d.name !== 'index.ts' && !d.name.startsWith('_'))
//   .map(d => d.name);
// for (const dir of moduleDirs) {
//   try {
//     const mod = require(join(__dirname, dir));
//     router.use('/' + dir, mod.default || mod);
//   } catch { /* skip modules without index */ }
// }

export default router;
