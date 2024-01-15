const { run } = require('runjs');
function clean () {
  try {
    run('rm -rf ./dist');
  } catch(err) {}
}
module.exports = { clean };
