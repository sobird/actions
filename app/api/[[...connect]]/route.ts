import { nextJsApiRouter } from '@connectrpc/connect-next';
import { NextRequest, NextResponse } from 'next/server';

import routes from './connect';
// import type { NextApiRequest, NextApiResponse, PageConfig } from 'next';

const { handler, config } = nextJsApiRouter({ routes });
// export { config };

export const GET = async (request: NextRequest, { params }) => {
  return NextResponse.json({});
};
