/**
 * Barrel: all Inngest functions collected in one place.
 * app.ts imports { inngest, inngestFunctions } from here.
 */
import { inngest } from './client';
import { textbookPipeline } from './functions/textbook-pipeline';

export { inngest };

export const inngestFunctions = [
  textbookPipeline,
];
