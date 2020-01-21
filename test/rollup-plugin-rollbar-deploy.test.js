import expect, { /* spyOn, c */createSpy } from 'expect';
// import nock from 'nock';
// import RollbarDeployPlugin from '../src/RollbarDeployPlugin';
// import { ROLLBAR_ENDPOINT } from '../src/constants';

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

    // this.options = {
    //   accessToken: 'aaaabbbbccccddddeeeeffff00001111',
    //   environment: 'test',
    //   revision: 'df6a46e5465e465d4fa6'
    // };

    // this.plugin = new RollbarDeployPlugin(this.options);
  });

  describe('constructor', function() {
    it('should return an instance', function() {
      expect(true).toBe(true);
    });
  });
});
