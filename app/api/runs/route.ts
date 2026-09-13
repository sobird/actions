import { NextRequest, NextResponse } from 'next/server';

import { createRunFromWorkflow } from '@/services/actions/createRun';

interface CreateRunBody {
  workflow?: string;
  ref?: string;
  commitSha?: string;
  workdir?: string;
  title?: string;
}

/**
 * Queue a run from a workflow supplied in the request body.
 *
 * Workflows are not persisted: the yaml is stored on the run's jobs and is the
 * only copy the runner will see.
 */
export const POST = async (req: NextRequest) => {
  let body: CreateRunBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  if (!body.workflow || typeof body.workflow !== 'string') {
    return NextResponse.json({ error: 'workflow is required' }, { status: 400 });
  }

  try {
    const { run, jobs } = await createRunFromWorkflow(body.workflow, {
      ref: body.ref,
      commitSha: body.commitSha,
      workdir: body.workdir ?? '',
      title: body.title,
    });

    return NextResponse.json(
      {
        runId: String(run.id),
        jobs: jobs.map((job) => ({ id: String(job.id), jobId: job.jobId, name: job.name })),
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
};
