import { findPackageScopes } from '../src/utils/scope-finder.js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { classifyFilesByScope } from '../src/utils/scope-classifier.js';