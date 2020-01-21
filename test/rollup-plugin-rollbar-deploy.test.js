import { rollup } from 'rollup';
import plugin from '../src/rollup-plugin-rollbar-deploy';

describe('rollup-plugin-rollbar-deploy', function() {
  beforeEach(function() {
    // this.compiler = {
    //   options: {},
    //   plugin: jest.fn(),
    //   hooks: {
    //     afterEmit: {
    //       tapAsync: jest.fn()
    //     },
    //   },
    //   resolvers: {
    //     loader: {
    //       plugin: jest.fn(),
    //       resolve: jest.fn(),
    //     },
    //     normal: {
    //       plugin: jest.fn(),
    //       resolve: jest.fn(),
    //     },
    //   },
    // };

    this.options = {
      accessToken: 'aaaabbbbccccddddeeeeffff00001111',
      environment: 'test',
      revision: 'df6a46e5465e465d4fa6',
      localUsername: 'Test User'
    };

    this.plugin = plugin(this.options);
  });

  describe('constructor', function() {
    it('should return an instance', () => {
      expect(this.plugin).toBeA(plugin);
    });
  });
});
