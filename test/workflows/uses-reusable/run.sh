
#!/bin/sh

actions run -W $(dirname "$0") --hosted -v

actions run -W $(dirname "$0")/circular.yml -j call-reusable-workflow-job  --hosted -v
