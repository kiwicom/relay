// @flow strict

import { GraphQLSchema, GraphQLObjectType, GraphQLString } from 'graphql';

const QueryRoot = new GraphQLObjectType({
  name: 'QueryRoot',
  fields: () => ({
    fieldString: {
      type: GraphQLString,
    },
    fieldDeprecated1: {
      type: GraphQLString,
      deprecationReason: 'Use field "fieldString" instead.',
    },
    fieldDeprecated2: {
      type: GraphQLString,
      deprecationReason: 'Use field "fieldString" instead.',
    },
  }),
});

export default new GraphQLSchema({
  query: QueryRoot,
});
