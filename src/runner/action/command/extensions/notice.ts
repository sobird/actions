import { IssueType } from '@/gen/runner/v1/messages_pb.ts';

import { IssueCommandExtension } from './issue';

const NoticeCommandExtension = IssueCommandExtension('notice', IssueType.NOTICE);

export default NoticeCommandExtension;
