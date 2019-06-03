// @flow

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  CodegenRunner,
  ConsoleReporter,
  DotGraphQLParser,
  FileWriter as RelayFileWriter,
  IRTransforms as RelayIRTransforms,
  JSModuleParser as RelayJSModuleParser,
} from 'relay-compiler';
import { buildASTSchema, buildClientSchema, parse, printSchema } from 'graphql';
import { globSync } from '@kiwicom/monorepo-utils';

import buildLanguagePlugin from './buildLanguagePlugin';

/* eslint-disable no-console */
// TODO: use @kiwicom/logger (not NPM published yet)

console.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
console.warn(
  'You are using experimental Kiwi.com Relay compiler. Expect breaking changes!',
);
console.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');

const reporter = new ConsoleReporter({
  verbose: true,
});

const options = {
  src: './src', // TODO: take from process.argv
  schema: '../graphql.kiwi.com.schema', // TODO: take from process.argv (or hide this detail)
  noFutureProofEnums: false,
  validate: false,
  include: ['**'],
  exclude: ['**/node_modules/**', '**/__mocks__/**', '**/__generated__/**'],
  artifactDirectory: null,
};

const languagePlugin = buildLanguagePlugin();
const srcDir = path.resolve(process.cwd(), options.src);
const schemaPath = path.resolve(process.cwd(), options.schema);
const schema = getSchema(schemaPath);
const sourceParserName = languagePlugin.inputExtensions.join('/');
const sourceSearchOptions = {
  extensions: languagePlugin.inputExtensions,
  include: options.include,
  exclude: ['**/*.graphql.*', ...options.exclude], // Do not include artifacts
};
const graphqlSearchOptions = {
  extensions: ['graphql'],
  include: options.include,
  exclude: [path.relative(srcDir, schemaPath)].concat(options.exclude),
};

const parserConfigs = {
  [sourceParserName]: {
    baseDir: srcDir,
    getFileFilter: RelayJSModuleParser.getFileFilter,
    getParser: RelayJSModuleParser.getParser,
    getSchema: () => schema,
    watchmanExpression: null,
    filepaths: getFilepathsFromGlob(srcDir, sourceSearchOptions),
  },
  graphql: {
    baseDir: srcDir,
    getParser: DotGraphQLParser.getParser,
    getSchema: () => schema,
    watchmanExpression: null,
    filepaths: getFilepathsFromGlob(srcDir, graphqlSearchOptions),
  },
};

const writerConfigs = {
  [sourceParserName]: {
    writeFiles: getRelayFileWriter(
      srcDir,
      languagePlugin,
      options.noFutureProofEnums,
      options.artifactDirectory,
    ),
    isGeneratedFile: (filePath: string) =>
      filePath.endsWith('.graphql.js') && filePath.includes('__generated__'),
    parser: sourceParserName,
    baseParsers: ['graphql'],
  },
};

const codegenRunner = new CodegenRunner({
  reporter,
  parserConfigs,
  writerConfigs,
  onlyValidate: options.validate,
  sourceControl: null,
});

const result = codegenRunner.compileAll();

if (result === 'ERROR') {
  process.exit(100);
}
if (options.validate && result !== 'NO_CHANGES') {
  process.exit(101);
}

function getFilepathsFromGlob(
  baseDir,
  options: {
    extensions: Array<string>,
    include: Array<string>,
    exclude: Array<string>,
  },
): $ReadOnlyArray<string> {
  const { extensions, include, exclude } = options;
  const patterns = include.map(inc => `${inc}/*.+(${extensions.join('|')})`);
  let filenames = [];
  patterns.forEach(
    pattern =>
      (filenames = filenames.concat(
        globSync(pattern, {
          cwd: baseDir,
          ignore: exclude,
        }),
      )),
  );
  return filenames;
}

function getSchema(schemaPath: string) {
  try {
    let source = fs.readFileSync(schemaPath, 'utf8');
    if (path.extname(schemaPath) === '.json') {
      source = printSchema(buildClientSchema(JSON.parse(source).data));
    }
    source = `
  directive @include(if: Boolean) on FRAGMENT_SPREAD | FIELD | INLINE_FRAGMENT
  directive @skip(if: Boolean) on FRAGMENT_SPREAD | FIELD | INLINE_FRAGMENT

  ${source}
  `;
    return buildASTSchema(parse(source), { assumeValid: true });
  } catch (error) {
    throw new Error(
      `
Error loading schema. Expected the schema to be a .graphql or a .json
file, describing your GraphQL server's API. Error detail:

${error.stack}
    `.trim(),
    );
  }
}

function getRelayFileWriter(
  baseDir: string,
  languagePlugin,
  noFutureProofEnums: boolean,
  outputDir?: ?string,
) {
  return ({
    onlyValidate,
    schema,
    documents,
    baseDocuments,
    sourceControl,
    reporter,
  }) => {
    const {
      commonTransforms,
      codegenTransforms,
      fragmentTransforms,
      printTransforms,
      queryTransforms,
      schemaExtensions,
    } = RelayIRTransforms;
    return RelayFileWriter.writeAll({
      config: {
        baseDir,
        compilerTransforms: {
          commonTransforms,
          codegenTransforms,
          fragmentTransforms,
          printTransforms,
          queryTransforms,
        },
        customScalars: {},
        formatModule: languagePlugin.formatModule,
        optionalInputFieldsForFlow: [],
        schemaExtensions,
        useHaste: false,
        noFutureProofEnums,
        extension: languagePlugin.outputExtension,
        typeGenerator: languagePlugin.typeGenerator,
        outputDir,
        persistQuery: text => {
          // TODO: send to remote server and return unique ID
          const hasher = crypto.createHash('md5');
          hasher.update(text);
          const id = hasher.digest('hex');
          return Promise.resolve(id);
        },
        // repersist: true, // TODO: only in CI (?)
      },
      onlyValidate,
      schema,
      baseDocuments,
      documents,
      reporter,
      sourceControl,
    });
  };
}