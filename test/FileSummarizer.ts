import fs from 'fs';

function summarizeFilesInDirectorySync(directory: string) {
  return fs.readdirSync(directory).map((fileName) => {
    return {
      directory,
      fileName,
    };
  });
}

exports.summarizeFilesInDirectorySync = summarizeFilesInDirectorySync;
