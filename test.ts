import docker from './pkg/docker';

const containers = await docker.listContainers();

const cc = containers.find((item) => {
  return item.Names.some((name) => {
    return name.substring(1) === 'php';
  });
});

console.log('cc', docker.getContainer(cc?.Id));
