import { ParsedFeature, ParsedScenario, ParsedScenarioOutline } from './models';
import { matchSteps } from './validation/step-definition-validation';
import {
  StepsDefinitionCallbackFunction,
  defineFeature
} from './feature-definition-creation';

const globalSteps: Array<{
  stepMatcher: string | RegExp;
  stepFunction: () => any;
}> = [];

const registerStep = (
  stepMatcher: string | RegExp,
  stepFunction: () => any
) => {
  globalSteps.push({ stepMatcher, stepFunction });
};

export const autoBindSteps = (
  features: ParsedFeature[],
  stepDefinitions: StepsDefinitionCallbackFunction[]
) => {
  stepDefinitions.forEach((stepDefinitionCallback) => {
    stepDefinitionCallback({
      defineStep: registerStep,
      given: registerStep,
      when: registerStep,
      then: registerStep,
      and: registerStep,
      but: registerStep,
      pending: () => {
        // Nothing to do
      }
    });
  });

  const errors: string[] = [];

  features.forEach((feature) => {
    defineFeature(feature, (test) => {
      const scenarioOutlineScenarios = feature.scenarioOutlines.map(
        (scenarioOutline) => scenarioOutline.scenarios[0]
      );

      const scenarios = [...feature.scenarios, ...scenarioOutlineScenarios];

      scenarios.forEach((scenario) => {
        test(scenario.title, (options) => {
          scenario.steps.forEach((step, stepIndex) => {
            const matches = globalSteps.filter((globalStep) =>
              matchSteps(step.stepText, globalStep.stepMatcher)
            );

            if (matches.length === 1) {
              const match = matches[0];
              options.defineStep(match.stepMatcher, match.stepFunction);
            } else {
              const matchingCode = matches.map(
                (match) =>
                  `${match.stepMatcher.toString()}\n\n${match.stepFunction.toString()}`
              );
              errors.push(
                `${
                  matches.length
                } step definition matches were found for step "${
                  step.stepText
                }" in scenario "${scenario.title}" in feature "${
                  feature.title
                }". Each step can only have one matching step definition. The following step definition matches were found:\n\n${matchingCode.join(
                  '\n\n'
                )}`
              );
            }
          });
        });
      });
    });
  });

  if (errors.length) {
    throw new Error(errors.join('\n\n'));
  }
};
