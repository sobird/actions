import { IssueType } from '@/gen/runner/v1/messages_pb.ts';

import { IssueCommandExtension } from './issue';

const WarningCommandExtension = IssueCommandExtension('warning', IssueType.WARNING);

export default WarningCommandExtension;
