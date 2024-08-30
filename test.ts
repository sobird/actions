import Git from './pkg/common/git';

try {
  const ref = await Git.Ref('/var/folders/0g/085cjcx1231cqqknq0k8pbzh0000gn/T/test-dir/tag');
  console.log('ref', ref);
} catch (err) {
  console.log('err', err);
}
