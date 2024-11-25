// Copyright 2021-2024 The Connect Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// https://github.com/connectrpc/connect-es/blob/main/packages/connect-next/src/connect-nextjs-adapter.ts
// https://github.com/connectrpc/connect-es/issues/542

import { createConnectRouter } from '@connectrpc/connect';
import {
  UniversalHandler,
  universalServerRequestFromFetch,
  universalServerResponseToFetch,
} from '@connectrpc/connect/protocol';
import {
  compressionBrotli,
  compressionGzip,
} from '@connectrpc/connect-node';
import { NextRequest } from 'next/server';

import type {
  ConnectRouter,
  ConnectRouterOptions,
} from '@connectrpc/connect';

interface NextJsApiRouterOptions extends ConnectRouterOptions {
  /**
   * Route definitions. We recommend the following pattern:
   *
   * Create a file `connect.ts` with a default export such as this:
   *
   * ```ts
   * import { ConnectRouter } from "@connectrpc/connect";
   *
   * export default (router: ConnectRouter) => {
   *   router.service(ElizaService, {});
   * }
   * ```
   *
   * Then pass this function here.
   */
  routes: (router: ConnectRouter) => void;
  /**
   * Serve all handlers under this prefix. For example, the prefix "/something"
   * will serve the RPC foo.FooService/Bar under "/something/foo.FooService/Bar".
   *
   * This is `/api` by default for Next.js.
   */
  prefix?: string;
}

/**
 * Provide your Connect RPCs via Next.js API routes.
 */
export function nextJsApiRouter(options: NextJsApiRouterOptions) {
  if (options.acceptCompression === undefined) {
    // eslint-disable-next-line no-param-reassign
    options.acceptCompression = [compressionGzip, compressionBrotli];
  }

  const router = createConnectRouter(options);
  options.routes(router);
  const prefix = options.prefix ?? '/api';
  const paths = new Map<string, UniversalHandler>();
  for (const uHandler of router.handlers) {
    paths.set(prefix + uHandler.requestPath, uHandler);
  }

  async function handler(req: NextRequest) {
    const uHandler = paths.get(req.nextUrl.pathname);

    if (!uHandler) {
      return new Response(undefined, { status: 404 });
    }

    try {
      const uReq = universalServerRequestFromFetch(req, {});
      const uRes = await uHandler(uReq);
      return universalServerResponseToFetch(uRes);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        `handler for rpc ${uHandler.method.name} of ${uHandler.service.typeName} failed`,
        error,
      );
    }
  }

  return {
    POST: handler,
    GET: handler,
    config: {
      api: {
        bodyParser: false,
      },
    },
  };
}
