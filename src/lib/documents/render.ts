import 'server-only';
import { renderToBuffer } from '@react-pdf/renderer';
import type { ReactElement } from 'react';

export async function renderPdf(doc: ReactElement): Promise<Buffer> {
  return renderToBuffer(doc);
}
