
#!/bin/sh

actions run -W $(dirname "$0") --image=-self-hosted -v

actions run -W $(dirname "$0")/circular.yml -j call-reusable-workflow-job  --image -self-hosted -v