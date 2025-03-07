/**
 * Workflow Planner
 * 对于通过服务端获取任务执行的的计划，服务端每次任务只会分配一个Job.
 *
 * sobird<i@sobird.me> at 2024/05/03 18:52:14 created.
 */

import fs from 'fs';
import {
  resolve, parse, join, basename,
} from 'node:path';

import log4js from 'log4js';

import Git from '@/pkg/common/git';
import Workflow from '@/pkg/workflow';

import Plan from './plan';

const logger = log4js.getLogger();

const git = new Git('.');

/** Planner contains methods for creating plans */
class WorkflowPlanner {
  constructor(public workflows: Workflow[]) {}

  /**
   * builds a new list of runs to execute in parallel for an event name
   */
  async planEvent(eventName: string) {
    const plan = new Plan();
    if (this.workflows.length === 0) {
      logger.debug('No workflows found by planner');
      return plan;
    }

    for await (const workflow of this.workflows) {
      const { events } = workflow;
      await workflow.WorkflowDispatchPrompts(eventName);

      if (events.length === 0) {
        logger.debug('No events found for workflow: %s', workflow.file);
      } else if (events.includes(eventName)) {
        plan.merge(workflow.plan());
      }
    }

    // this.workflows.forEach((workflow) => {

    // });
    return plan;
  }

  planJob(...jobId: string[]) {
    if (this.workflows.length === 0) {
      logger.debug(`No jobs found for workflow: ${jobId}`);
    }

    const plan = new Plan();

    this.workflows.forEach((workflow) => {
      plan.merge(workflow.plan(...jobId));
    });

    return plan;
  }

  planAll() {
    if (this.workflows.length === 0) {
      logger.debug('No workflows found by planner');
    }

    const plan = new Plan();

    this.workflows.forEach((workflow) => {
      plan.merge(workflow.plan());
    });

    return plan;
  }

  /**
   * get all the events in the workflows file
   */
  get events() {
    let eventsSet = new Set<string>();
    this.workflows.forEach((workflow) => {
      eventsSet = new Set([...eventsSet, ...workflow.events]);
      // workflow.events.forEach((event) => {
      //   eventsSet.add(event);
      // });
    });

    return Array.from(eventsSet).sort();
  }

  /** will load a specific workflow, all workflows from a directory or all workflows from a directory and its subdirectories */
  static async Collect(path: string, recursive: boolean = false) {
    const absPath = path || resolve(path);
    const stat = fs.statSync(absPath);

    const workflows: Workflow[] = [];

    if (stat.isDirectory()) {
      logger.debug(`Loading workflows from '${absPath}'`);

      const files = fs.readdirSync(absPath, { withFileTypes: true, recursive });

      for await (const file of files) {
        const { ext } = parse(file.name);
        if (file.isFile() && (ext === '.yml' || ext === '.yaml')) {
          const filename = join(file.parentPath, file.name);
          const workflow = Workflow.Read(filename);
          workflow.file = filename;
          try {
            workflow.sha = await git.fileSha(filename);
          } catch (error) {
            //
          }
          workflows.push(workflow);
        }
      }
    } else {
      logger.debug(`Loading workflow '${absPath}'`);
      const workflow = Workflow.Read(absPath);
      workflow.file = basename(absPath);
      try {
        workflow.sha = await git.fileSha(absPath);
      } catch (error) {
        //
      }
      workflows.push(workflow);
    }

    return new WorkflowPlanner(workflows);
  }

  static Combine(...workflows: Workflow[]) {
    return new WorkflowPlanner(workflows);
  }

  static Single(workflowPayload: string, name?: string) {
    const workflow = Workflow.Load(workflowPayload);
    workflow.file = name;
    return new WorkflowPlanner([workflow]);
  }
}

export default WorkflowPlanner;
