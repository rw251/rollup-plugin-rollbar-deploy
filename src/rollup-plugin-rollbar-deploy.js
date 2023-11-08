// Custom rollup plugin for uploading rollbar deploys
import FormData from 'form-data';
import { ROLLBAR_ENDPOINT } from './constants.js';

const submitDeployment = ({ rollbarEndpoint, silent, form }) =>
  new Promise((resolve, reject) => {
    form.submit(rollbarEndpoint, (err, response) => {
      if (err) return reject(err);
      if (response.statusCode === 200) {
        if (!silent) {
          console.log('Rollbar successfully notified of deployment.');
        }
        return resolve();
      }
      let body = [];
      return response
        .on('data', (chunk) => {
          body.push(chunk);
        })
        .on('end', () => {
          body = Buffer.concat(body).toString();
          console.log(
            'Rollbar was not notified of deployment. The response from the api call is:'
          );
          console.log(body);
          resolve();
        });
    });
  });

export default function rollbarDeploy({
  accessToken,
  revision,
  environment,
  localUsername,
  silent = false,
  rollbarEndpoint = ROLLBAR_ENDPOINT,
}) {
  return {
    localProps: {
      accessToken,
      revision,
      environment,
      localUsername,
      silent,
      rollbarEndpoint,
    },
    name: 'rollup-plugin-rollbar-deploy',
    async writeBundle() {
      const form = new FormData();
      if (localUsername) form.append('local_username', localUsername);
      form.append('access_token', accessToken);
      form.append('revision', revision);
      form.append('environment', environment);

      await submitDeployment({ rollbarEndpoint, form, silent });
    },
  };
}
