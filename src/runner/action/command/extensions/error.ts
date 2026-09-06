import { IssueType } from '@/gen/runner/v1/messages_pb.ts';

import { IssueCommandExtension } from './issue';

const ErrorCommandExtension = IssueCommandExtension('error', IssueType.ERROR);

export default ErrorCommandExtension;
