import * as core from '@actions/core';
import * as github from '@actions/github';

try {
  core.exportVariable('sobird', 'haha');
} catch (error) {
  core.setFailed((error as Error).message);
}
