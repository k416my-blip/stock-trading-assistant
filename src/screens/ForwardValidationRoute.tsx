import type { ComponentType } from 'react';

/** 前向き検証画面 — typecheck 対象外（tsconfig.typecheck.json exclude） */
const ForwardValidationScreen = require('./ForwardValidationScreen')
  .ForwardValidationScreen as ComponentType;

export default ForwardValidationScreen;
