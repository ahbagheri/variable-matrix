import { normalizeGroup } from './matrix.js';

function demoGroup(id, env, variables) {
  return {
    id,
    name: `checkin-webapp-${env}`,
    type: 'Vsts',
    description: `checkin-webapp ${env}`,
    variables,
  };
}

export function demoGroups() {
  return [
    demoGroup(101, 'dev', {
      AFTER_SIGN_IN_ITEM: { value: 'true', isSecret: false },
      HEALTH_CHECK: { value: 'checkin-webapp-dev', isSecret: false },
      ONLINE_CHECKIN_FEATURE_AVAILABLE: { value: 'true', isSecret: false },
      API_URL: { value: 'https://api-dev.example.com', isSecret: false },
      REDIS_PASSWORD: { value: null, isSecret: true },
    }),
    demoGroup(102, 'qa', {
      AFTER_SIGN_IN_ITEM: { value: 'true', isSecret: false },
      HEALTH_CHECK: { value: 'checkin-webapp-qa', isSecret: false },
      ONLINE_CHECKIN_FEATURE_AVAILABLE: { value: 'true', isSecret: false },
      API_URL: { value: 'https://api-qa.example.com', isSecret: false },
      REDIS_PASSWORD: { value: null, isSecret: true },
    }),
    demoGroup(103, 'staging', {
      AFTER_SIGN_IN_ITEM: { value: 'true', isSecret: false },
      HEALTH_CHECK: { value: 'checkin-webapp-staging', isSecret: false },
      ONLINE_CHECKIN_FEATURE_AVAILABLE: { value: 'true', isSecret: false },
      API_URL: { value: 'https://api-staging.example.com', isSecret: false },
      REDIS_PASSWORD: { value: null, isSecret: true },
    }),
    demoGroup(104, 'production', {
      AFTER_SIGN_IN_ITEM: { value: 'false', isSecret: false },
      HEALTH_CHECK: { value: 'checkin-webapp-production', isSecret: false },
      ONLINE_CHECKIN_FEATURE_AVAILABLE: { value: 'false', isSecret: false },
      API_URL: { value: 'https://api.example.com', isSecret: false },
      REDIS_PASSWORD: { value: null, isSecret: true },
    }),
  ];
}

export function demoGroupsNormalized() {
  return demoGroups().map(normalizeGroup);
}
