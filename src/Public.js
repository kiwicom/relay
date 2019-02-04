// @flow

import { TimeoutError as unstable_TimeoutError } from '@kiwicom/fetch'; // eslint-disable-line babel/camelcase

/**
 * The public interface to Relay package.
 */
module.exports = {
  unstable_TimeoutError,

  createEnvironment: require('./createEnvironment'),

  // fetchers:
  createNetworkFetcher: require('./fetchers/createNetworkFetcher'),
};
