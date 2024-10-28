import Executor from '@/pkg/common/executor';

import Action from '..';

class DockerAction extends Action {
  public main() {
    return new Executor();
  }
}

export default DockerAction;
