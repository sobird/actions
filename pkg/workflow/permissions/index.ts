/**
 * @todo
 *
 * sobird<i@sobird.me> at 2024/05/04 18:36:54 created.
 */

type RangValue = 'read' | 'write' | 'none' | 'read|write' | 'read|none' | 'write|none' | 'read|write|none';

class Permissions {
  actions: RangValue = 'none';

  checks: RangValue;

  contents: RangValue;

  deployments: RangValue;

  'id-token': RangValue;

  issues: RangValue;

  discussions: RangValue;

  packages: RangValue;

  pages: RangValue;

  'pull-requests': RangValue;

  'repository-projects': RangValue;

  'security-events': RangValue;

  statuses: RangValue;

  constructor() {
    this.actions = 'none';
  }
}

export default Permissions;
