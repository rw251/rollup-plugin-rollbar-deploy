import { rollup } from 'rollup';
import { join } from 'path';
import { EventEmitter } from 'events';
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

  describe('submitDeployment', function() {
    let submitDeployment;

    beforeEach(function() {
      submitDeployment = rollbarDeploy.__get__('submitDeployment');
    });

    it('resumes the response stream to close the HTTP connection', async function() {
      const response = new EventEmitter();
      response.statusCode = 200;
      response.resume = jest.fn(() => {
        process.nextTick(() => response.emit('end'));
      });

      const form = {
        submit: jest.fn((endpoint, callback) => {
          callback(null, response);
        })
      };

      await submitDeployment({ form, rollbarEndpoint: ROLLBAR_ENDPOINT, silent: true });

      expect(form.submit).toHaveBeenCalled();
      expect(response.resume).toHaveBeenCalledTimes(1);
    });

    it('handles success responses even without resume handlers', async function() {
      const response = new EventEmitter();
      response.statusCode = 200;

      const form = {
        submit: jest.fn((endpoint, callback) => {
          callback(null, response);
          process.nextTick(() => response.emit('end'));
        })
      };

      await expect(
        submitDeployment({ form, rollbarEndpoint: ROLLBAR_ENDPOINT, silent: true })
      ).resolves.toBeUndefined();
    });

    it('rejects when form submission fails', async function() {
      const form = {
        submit: (endpoint, callback) => callback(new Error('network boom'))
      };

      await expect(
        submitDeployment({ form, rollbarEndpoint: ROLLBAR_ENDPOINT, silent: true })
      ).rejects.toThrow('network boom');
    });

    it('logs success feedback when not run silently', async function() {
      const response = new EventEmitter();
      response.statusCode = 200;
      response.resume = jest.fn(() => {
        process.nextTick(() => response.emit('end'));
      });

      const form = {
        submit: jest.fn((endpoint, callback) => {
          callback(null, response);
        })
      };

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await submitDeployment({ form, rollbarEndpoint: ROLLBAR_ENDPOINT, silent: false });

      expect(response.resume).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith('Rollbar successfully notified of deployment.');
      logSpy.mockRestore();
    });

    it('logs the error body when Rollbar replies with a non-200', async function() {
      const response = new EventEmitter();
      response.statusCode = 500;

      const form = {
        submit: jest.fn((endpoint, callback) => {
          callback(null, response);
          process.nextTick(() => {
            response.emit('data', Buffer.from('deploy failed'));
            response.emit('end');
          });
        })
      };

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await submitDeployment({ form, rollbarEndpoint: ROLLBAR_ENDPOINT, silent: true });

      expect(form.submit).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        'Rollbar was not notified of deployment. The response from the api call is:'
      );
      expect(logSpy).toHaveBeenCalledWith('deploy failed');
      logSpy.mockRestore();
    });
  });

  describe('writeBundle', function() {
    afterEach(function() {
      rollbarDeploy.__ResetDependency__('FormData');
      rollbarDeploy.__ResetDependency__('submitDeployment');
    });

    it('appends all deploy metadata before submitting to Rollbar', async function() {
      const append = jest.fn();
      const fakeForm = { append };
      const FakeFormData = jest.fn(() => fakeForm);
      rollbarDeploy.__Rewire__('FormData', FakeFormData);

      const mockSubmitDeployment = jest.fn().mockResolvedValue();
      rollbarDeploy.__Rewire__('submitDeployment', mockSubmitDeployment);

      const plugin = rollbarDeploy({
        accessToken: 'token',
        environment: 'staging',
        revision: 'abc123',
        localUsername: 'ci-user'
      });

      await plugin.writeBundle();

      expect(FakeFormData).toHaveBeenCalledTimes(1);
      expect(append).toHaveBeenCalledWith('local_username', 'ci-user');
      expect(append).toHaveBeenCalledWith('access_token', 'token');
      expect(append).toHaveBeenCalledWith('revision', 'abc123');
      expect(append).toHaveBeenCalledWith('environment', 'staging');
      expect(mockSubmitDeployment).toHaveBeenCalledWith(
        expect.objectContaining({ form: fakeForm, silent: false })
      );
    });

    it('skips the optional local_username when not provided', async function() {
      const append = jest.fn();
      const fakeForm = { append };
      const FakeFormData = jest.fn(() => fakeForm);
      rollbarDeploy.__Rewire__('FormData', FakeFormData);

      const mockSubmitDeployment = jest.fn().mockResolvedValue();
      rollbarDeploy.__Rewire__('submitDeployment', mockSubmitDeployment);

      const plugin = rollbarDeploy({
        accessToken: 'token',
        environment: 'production',
        revision: 'abc123'
      });

      await plugin.writeBundle();

      expect(append).toHaveBeenCalledTimes(3);
      expect(append).not.toHaveBeenCalledWith('local_username', expect.anything());
    });
  });
});
