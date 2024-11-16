import { ConnectRouter, ConnectError } from '@connectrpc/connect';
import log4js from 'log4js';

import { ActionsRunnerModel, ActionsRunnerTokenModel } from '@/models';
import { PingResponse } from '@/pkg/service/ping/v1/messages_pb';
import { PingService } from '@/pkg/service/ping/v1/services_connect';
import { RegisterResponse, Runner } from '@/pkg/service/runner/v1/messages_pb';
import { RunnerService } from '@/pkg/service/runner/v1/services_connect';
import { tryCatch } from '@/utils/test';

const logger = log4js.getLogger('connect');

export default (router: ConnectRouter) => {
  // Register your service implementations here
  // router.rpc(PingService, PingService.methods.ping, async (req) => {
  //   return new PingResponse({
  //     data: `Hello, ${req.data}`,
  //   });
  // });

  router.service(PingService, {
    ping: (req) => {
      return new PingResponse({
        data: `Hello, ${req.data}`,
      });
    },
  });

  router.service(RunnerService, {
    async register(req, res) {
      console.log('req', req);
      if (req.token === '' || req.name === '') {
        throw new ConnectError('missing runner token, name', 3);
      }

      const actionsRunnerToken = await ActionsRunnerTokenModel.findOne({
        where: {
          token: req.token,
        },
      });

      if (!actionsRunnerToken) {
        throw new ConnectError('runner registration token not found', 5);
      }

      if (!actionsRunnerToken.enabled) {
        throw new ConnectError('runner registration token has been invalidated, please use the latest one', 4);
      }

      const { labels } = req;

      // create new runner

      await tryCatch(async () => {

      });

      const { name } = req;

      const actionsRunner = await ActionsRunnerModel.create({
        name: req.name,
        ownerId: actionsRunnerToken.ownerId,
        repositoryId: actionsRunnerToken.repositoryId,
        version: req.version,
        labels: req.labels,

        token: 'token',
        tokenHash: 'tokenHash',
        tokenSalt: 'tokenSalt',
      });

      return new RegisterResponse({
        runner: new Runner({
          id: actionsRunner.id,
          uuid: actionsRunner.uuid,
          token: actionsRunner.token,
          name,
          version: actionsRunner.version,
          labels: actionsRunner.labels,
        }),
      });
    },
  });
};
