// Compact label matching the Azure DevOps Pill component.
export default function Pill({ tone = 'neutral', outline, className = '', children }) {
  const classes = ['vm-pill', `vm-pill-${tone}`];
  if (outline) classes.push('vm-pill-outline');
  if (className) classes.push(className);
  return <span className={classes.join(' ')}>{children}</span>;
}
