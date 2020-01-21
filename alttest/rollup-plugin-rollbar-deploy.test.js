import expect, { spyOn, createSpy } from 'expect';
import nock from 'nock';
import RollbarDeployPlugin from '../src/RollbarDeployPlugin';
import { ROLLBAR_ENDPOINT } from '../src/constants';

describe('RollbarDeployPlugin', function() {
  beforeEach(function() {
    this.compiler = {
      options: {},
      plugin: createSpy(),
      hooks: {
        afterEmit: {
          tapAsync: createSpy()
        },
      },
      resolvers: {
        loader: {
          plugin: createSpy(),
          resolve: createSpy(),
        },
        normal: {
          plugin: createSpy(),
          resolve: createSpy(),
        },
      },
    };

    this.options = {
      accessToken: 'aaaabbbbccccddddeeeeffff00001111',
      environment: 'test',
      revision: 'df6a46e5465e465d4fa6'
    };

    this.plugin = new RollbarDeployPlugin(this.options);
  });

  describe('constructor', function() {
    it('should return an instance', function() {
      expect(this.plugin).toBeA(RollbarDeployPlugin);
    });

    it('should set options', function() {
      const options = { ...this.options, silent: true };
      const plugin = new RollbarDeployPlugin(options);
      expect(plugin).toInclude(options);
    });

    it('should default silent to false', function() {
      expect(this.plugin).toInclude({ silent: false });
    });

    it('should default rollbarEndpoint to ROLLBAR_ENDPOINT constant', function() {
      expect(this.plugin).toInclude({ rollbarEndpoint: ROLLBAR_ENDPOINT });
    });

    it('should access string value for rollbarEndpoint', function() {
      const customEndpoint = 'https://api.rollbar.custom.com/api/1/deploy';
      const options = { ...this.options, rollbarEndpoint: customEndpoint };
      const plugin = new RollbarDeployPlugin(options);
      expect(plugin).toInclude({ rollbarEndpoint: customEndpoint });
    });
  });

  describe('apply', function() {
    it('should hook into "after-emit"', function() {
      this.plugin.apply(this.compiler);
      expect(this.compiler.hooks.afterEmit.tapAsync.calls.length).toBe(1);
      expect(this.compiler.hooks.afterEmit.tapAsync.calls[0].arguments).toEqual([
        'after-emit',
        this.plugin.afterEmit.bind(this.plugin)
      ]);
    });

    it('should plug into `after-emit" when "hooks" is undefined', function() {
      delete this.compiler.hooks;
      this.plugin.apply(this.compiler);
      expect(this.compiler.plugin.calls.length).toBe(1);
      expect(this.compiler.plugin.calls[0].arguments).toEqual([
        'after-emit',
        this.plugin.afterEmit.bind(this.plugin)
      ]);
    });
  });

  describe('afterEmit', function() {
    beforeEach(function() {
      this.uploadDeploy = spyOn(this.plugin, 'uploadDeploy')
        .andCall((callback) => callback());
    });

    it('should call uploadDeploy', function(done) {
      const compilation = {
        errors: [],
        warnings: []
      };
      this.plugin.afterEmit(compilation, () => {
        expect(this.uploadDeploy.calls.length).toBe(1);
        expect(compilation.errors.length).toBe(0);
        expect(compilation.warnings.length).toBe(0);
        done();
      });
    });

    it('should add upload warnings to compilation warnings, '
      + 'if ignoreErrors is true and silent is false', function(done) {
      const compilation = {
        errors: [],
        warnings: []
      };
      this.plugin.ignoreErrors = true;
      this.plugin.silent = false;
      this.uploadDeploy = spyOn(this.plugin, 'uploadDeploy')
        .andCall((callback) => callback(new Error()));
      this.plugin.afterEmit(compilation, () => {
        expect(this.uploadDeploy.calls.length).toBe(1);
        expect(compilation.errors.length).toBe(0);
        expect(compilation.warnings.length).toBe(1);
        expect(compilation.warnings[0]).toBeA(Error);
        done();
      });
    });

    it('should not add upload errors to compilation warnings if silent is true', function(done) {
      const compilation = {
        errors: [],
        warnings: []
      };
      this.plugin.ignoreErrors = true;
      this.plugin.silent = true;
      this.plugin.afterEmit(compilation, () => {
        expect(this.uploadDeploy.calls.length).toBe(1);
        expect(compilation.errors.length).toBe(0);
        expect(compilation.warnings.length).toBe(0);
        done();
      });
    });

    it('should add upload errors to compilation errors', function(done) {
      const compilation = {
        errors: [],
        warnings: []
      };
      this.plugin.ignoreErrors = false;
      this.uploadDeploy = spyOn(this.plugin, 'uploadDeploy')
        .andCall((callback) => callback(new Error()));
      this.plugin.afterEmit(compilation, () => {
        expect(this.uploadDeploy.calls.length).toBe(1);
        expect(compilation.warnings.length).toBe(0);
        expect(compilation.errors.length).toBe(1);
        expect(compilation.errors[0]).toBeA(Error);
        done();
      });
    });

    it('should add validation errors to compilation', function(done) {
      const compilation = {
        errors: [],
        warnings: []
      };

      this.plugin = new RollbarDeployPlugin({
        revision: 'd654a6f46ad4f5',
        environment: 'test'
      });
      this.plugin.afterEmit(compilation, () => {
        expect(this.uploadDeploy.calls.length).toBe(0);
        expect(compilation.errors.length).toBe(1);
        done();
      });
    });
  });

  describe('uploadDeploy', function() {
    beforeEach(function() {
      this.info = spyOn(console, 'info');
    });

    afterEach(function() {
      this.info.restore();
    });

    it('should callback without err param if upload is success', function(done) {
      const scope = nock('https://api.rollbar.com:443') // eslint-disable-line no-unused-vars
        .post('/api/1/deploy')
        .reply(200, JSON.stringify({ err: 0, result: 'master-latest-sha' }));

      this.plugin.uploadDeploy((err) => {
        if (err) {
          return done(err);
        }
        expect(this.info).toHaveBeenCalledWith('Deployment logged to Rollbar');
        done();
      });
    });

    it('should not log upload to console if silent option is true', function(done) {
      const scope = nock('https://api.rollbar.com:443') // eslint-disable-line no-unused-vars
        .post('/api/1/deploy')
        .reply(200, JSON.stringify({ err: 0, result: 'master-latest-sha' }));

      this.plugin.silent = true;
      this.plugin.uploadDeploy((err) => {
        if (err) {
          return done(err);
        }
        expect(this.info).toNotHaveBeenCalled();
        done();
      });
    });

    it('should log upload to console if silent option is false', function(done) {
      const scope = nock('https://api.rollbar.com:443') // eslint-disable-line no-unused-vars
        .post('/api/1/deploy')
        .reply(200, JSON.stringify({ err: 0, result: 'master-latest-sha' }));

      this.plugin.silent = false;
      this.plugin.uploadDeploy((err) => {
        if (err) {
          return done(err);
        }
        expect(this.info).toHaveBeenCalledWith('Deployment logged to Rollbar');
        done();
      });
    });

    it('should return error message if failure response includes message', function(done) {
      const scope = nock('https://api.rollbar.com:443') // eslint-disable-line no-unused-vars
        .post('/api/1/deploy')
        .reply(422, JSON.stringify({ err: 1, message: 'missing xyz file upload' }));

      this.plugin.uploadDeploy((err) => {
        expect(err).toExist();
        expect(err).toInclude({
          message: 'failed to log deployment to Rollbar: missing xyz file upload'
        });
        done();
      });
    });

    it('should handle error response with empty body', function(done) {
      const scope = nock('https://api.rollbar.com:443') // eslint-disable-line no-unused-vars
        .post('/api/1/deploy')
        .reply(422, null);

      this.plugin.uploadDeploy((err) => {
        expect(err).toExist();
        expect(err.message).toMatch(/failed to log deployment to Rollbar: [\w\s]+/);
        done();
      });
    });

    it('should handle HTTP request error', function(done) {
      const scope = nock('https://api.rollbar.com:443') // eslint-disable-line no-unused-vars
        .post('/api/1/deploy')
        .replyWithError('something awful happened');

      this.plugin.uploadDeploy((err) => {
        expect(err).toExist();
        expect(err).toInclude({
          message: 'failed to log deployment to Rollbar: something awful happened'
        });
        done();
      });
    });
  });
});
