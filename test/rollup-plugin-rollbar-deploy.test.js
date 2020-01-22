import { rollup } from 'rollup';
import { join } from 'path';
import rollbarDeploy from '../src/rollup-plugin-rollbar-deploy';
import { ROLLBAR_ENDPOINT } from '../src/constants';

process.chdir(join(__dirname, 'fixtures'));

describe('rollup-plugin-rollbar-deploy', function() {
  let rollupPlugin;
  let options;
  beforeEach(function() {
    options = {
      accessToken: 'aaaabbbbccccddddeeeeffff00001111',
      environment: 'test',
      revision: 'df6a46e5465e465d4fa6',
      localUsername: 'Test User'
    };

    rollupPlugin = rollbarDeploy(options);
  });

  describe('constructor', function() {
    it('should return an instance with the correct name', function() {
      expect(rollupPlugin.name).toBe('rollup-plugin-rollbar-deploy');
    });

    it('should set options', function() {
      const localOptions = { ...this.options, silent: true };
      const localPlugin = rollbarDeploy(localOptions);
      expect(localPlugin).not.toBe(undefined);
    });

    it('should default silent to false', function() {
      expect(rollupPlugin.localProps).toEqual(expect.objectContaining({ silent: false }));
    });

    it('should default rollbarEndpoint to ROLLBAR_ENDPOINT constant', function() {
      expect(rollupPlugin.localProps).toEqual(
        expect.objectContaining({ rollbarEndpoint: ROLLBAR_ENDPOINT })
      );
    });

    it('should access string value for rollbarEndpoint', function() {
      const customEndpoint = 'https://api.rollbar.custom.com/api/1/deploy';
      const localOptions = { ...this.options, rollbarEndpoint: customEndpoint };
      const localPlugin = rollbarDeploy(localOptions);
      expect(localPlugin.localProps).toEqual(
        expect.objectContaining({ rollbarEndpoint: customEndpoint })
      );
    });
  });

  describe('apply', function() {
    it('should call submitDeployment', async function() {
      const mockSubmitDeployment = jest.fn();
      rollbarDeploy.__Rewire__('submitDeployment', mockSubmitDeployment);

      const bundle = await rollup({
        input: 'index.js',
        plugins: [rollbarDeploy(options)]
      });
      await bundle.write({ dir: 'output', format: 'umd' });
      expect(mockSubmitDeployment.mock.calls.length).toBe(1);
      rollbarDeploy.__ResetDependency__('submitDeployment');
    });

    it('should call submitDeployment after writeBundle hook', async function() {
      const mockSubmitDeployment = jest.fn();
      rollbarDeploy.__Rewire__('submitDeployment', mockSubmitDeployment);

      expect(mockSubmitDeployment.mock.calls.length).toBe(0);
      const bundle = await rollup({
        input: 'index.js',
        plugins: [rollbarDeploy(options)]
      });
      expect(mockSubmitDeployment.mock.calls.length).toBe(0);
      await bundle.write({ dir: 'output', format: 'umd' });
      expect(mockSubmitDeployment.mock.calls.length).toBe(1);
      rollbarDeploy.__ResetDependency__('submitDeployment');
    });

    it('should call submitDeployment with the correct parameters', async function() {
      const mockSubmitDeployment = jest.fn();
      rollbarDeploy.__Rewire__('submitDeployment', mockSubmitDeployment);

      const bundle = await rollup({
        input: 'index.js',
        plugins: [rollbarDeploy(options)]
      });
      await bundle.write({ dir: 'output', format: 'umd' });
      expect(mockSubmitDeployment.mock.calls.length).toBe(1);
      expect(mockSubmitDeployment.mock.calls[0][0].silent).toBe(false);
      expect(mockSubmitDeployment.mock.calls[0][0].rollbarEndpoint).toBe(ROLLBAR_ENDPOINT);
      rollbarDeploy.__ResetDependency__('submitDeployment');
    });
  });
});
