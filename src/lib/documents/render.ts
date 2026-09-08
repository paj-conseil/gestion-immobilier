import 'server-only';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import type { ReactElement } from 'react';

export async function renderPdf(doc: ReactElement<DocumentProps>): Promise<Buffer> {
  return renderToBuffer(doc);
}
