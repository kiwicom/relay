This package is **opinionated Relay wrapper** used at Kiwi.com. Goal of this package is to create powerful yet simple to use Relay wrapper with all the important features:

- query logging during development
- network fetching with retries and timeouts (see `@kiwicom/fetch`)
- support for uploadables
- request burst cache (response cache)
- persistent queries

More info about Relay, prior art:

- [Relay Docs](https://facebook.github.io/relay/docs/en/introduction-to-relay.html)
- [Relay Modern Network Deep Dive](https://medium.com/entria/relay-modern-network-deep-dive-ec187629dfd3)
- [Advanced Relay topics](https://github.com/mrtnzlml/meta/blob/master/relay.md)
- [Relay Example](https://github.com/kiwicom/relay-example)

<!-- AUTOMATOR:HIRING_BANNER --><!-- /AUTOMATOR:HIRING_BANNER -->

# Install

**Please read this carefully.**

Before you start you should uninstall _all_ the Relay related packages you installed manually (Relay runtime, compiler, `react-relay`). You should also remove custom `flow-typed` definitions for Relay. You can remove the `babel-plugin-relay` as well in case you use `@kiwicom/babel-preset-kiwicom` (which is highly recommended). This package takes care about everything you need.

```text
yarn add react @kiwicom/relay
```

Usage:

- you should always use `@kiwicom/relay` package and never Relay dependencies directly
- do not import internals of this package (no `@kiwicom/relay/something/private.js`)
- please contact us directly in case something is problematic

# Minimal example

```js
import * as React from 'react';
import { graphql, QueryRenderer } from '@kiwicom/relay';
import type { AppQueryResponse } from '__generated__/AppQuery.graphql';

function handleResponse(props: AppQueryResponse) {
  const edges = props.allLocations?.edges ?? [];
  return (
    <ol>
      {edges.map(edge => (
        <li key={edge?.node?.id}>{edge?.node?.name}</li>
      ))}
    </ol>
  );
}

export default function App(props) {
  return (
    <QueryRenderer
      // Following `clientID` helps us to identify who is sending the request and it's
      // required unless you provide custom `environment` (see bellow).
      clientID="unique-client-identification"
      query={graphql`
        query AppQuery {
          allLocations(first: 20) {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      `}
      onSystemError={({ error, retry }) => console.error(error)} // optional (Sentry maybe?)
      onLoading={() => <div>Loading...</div>} // optional
      onResponse={handleResponse}
    />
  );
}
```

This API is high-level on purpose but it's possible to decompose it when you need something more advanced (custom `Environment` for example). However, even the decomposed parts are still very opinionated and new features are being unlocked only when necessary.

# Custom Environment

The default `QueryRenderer` falls back to querying https://graphql.kiwi.com if custom environment is not specified. This helps you to start faster but you have to specify `clientID` to identify the requests. You can also create your own environment:

```js
import { createEnvironment, createNetworkFetcher } from '@kiwicom/relay';

const Environment = createEnvironment({
  fetchFn: createNetworkFetcher('https://graphql.kiwi.com', {
    'X-Client': '** TODO **',
  }),
});
```

This way you can change the URL or provide additional headers (`X-Client` is still required in `createNetworkFetcher`). You can even replace the whole network fetcher if you want (not recommended). As you can see the high-level API decomposes nicely: it allows you to start quickly with a solid base but you can also use very specific features to your application if you want to. But please, consider if these features could be beneficial even for other users and maybe contribute them back.

Now, just use the created environment:

```js
export default function App() {
  return (
    <QueryRenderer
      environment={Environment}
      query={graphql` ... `}
      onResponse={handleResponse}
    />
  );
}
```

# Custom `render` behavior

It's certainly possible to override the and `render` property just like `environment`. However, please note that `render` property has priority over `onSystemError`, `onLoading` and `onResponse`. It's not recommended to use it unless you need something really special because these preferred 3 props solve majority of the cases.

```js
export default function App() {
  return (
    <QueryRenderer
      environment={Environment}
      query={graphql` ... `}
      render={({ error, props, retry }) => {
        /* TODO */
      }}
    />
  );
}
```

# Refetch container

Refetch container is the best when you are changing variables in the component fragment or just simply refetching. Typical example is search or bi-directional pagination. Simply import the HoC as well as the refetch Flow type:

```js
import {
  graphql,
  createRefetchContainer,
  type RefetchRelayProp,
} from '@kiwicom/relay';
```

Usage:

```js
export default createRefetchContainer(
  Component,
  /* TODO: refetch fragments */,
  /* TODO: refetch query */
);
```

And later you can call the refetch function:

```js
function loadMore() {
  // property `relay` should be annotated with the `RefetchRelayProp` type
  props.relay.refetch(/* TODO: refetchVariables */);
}
```

Similar rules apply to pagination container which solves one particular use-case of refetch container: "load more" pagination. The difference is that you have to use `type PaginationRelayProp` instead.

# Tips

## Use custom `QueryRenderer` wrapper

It's a good idea to create a custom wrapper of the `QueryRenderer` so you don't have to copy-paste it everywhere. This could be your new API (no loading, system error handlers or client identification):

```js
export default function App() {
  return (
    <CustomQueryRenderer
      query={graphql`
        query AppQuery {
          ...AllLocations_data
        }
      `}
      render={props => null} // TODO (handleResponse)
    />
  );
}
```

## Do not expose global `Environment`

You should never import your custom environment directly when working with mutations or subscriptions. Always use the environment provided in the props (exposed by any Relay container):

```js
import {
  type RelayProp, // or `PaginationRelayProp` or `RefetchRelayProp` types
} from '@kiwicom/relay';

type Props = {| +relay: RelayProp |};

function Component(props: Props) {
  useEffect(() => {
    commitMutation(props.relay.environment, { mutation: graphql` ... ` });
  });
}
```

Only this way you can be sure that your mutation/subscription is using correct environment. This common bug is usually not very visible but it's very serious when you have multiple environments in your application.
