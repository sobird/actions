import Git from './pkg/common/git';

const executor = Git.CloneExecutor('https://gitea.com/sobird/actions-test', '/var/folders/0g/085cjcx1231cqqknq0k8pbzh0000gn/T/actions/sobird/actions-test/531aeeb9a2443705d9154fb543c4d6685a4e996e', '531aeeb9a2443705d9154fb543c4d6685a4e996e');
const res = await executor.execute();
console.log('res', res);
