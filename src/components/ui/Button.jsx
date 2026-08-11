// Consistent button matching Azure DevOps button variants (default / primary / subtle).
export default function Button({
  variant = 'default',
  size,
  iconOnly,
  pressed,
  className = '',
  type = 'button',
  ...rest
}) {
  const classes = ['vm-btn'];
  if (variant === 'primary') classes.push('vm-btn-primary');
  else if (variant === 'subtle') classes.push('vm-btn-subtle');
  else if (variant === 'danger') classes.push('vm-btn-danger');
  if (size === 'small') classes.push('vm-btn-small');
  if (iconOnly) classes.push('vm-btn-icon');
  if (pressed) classes.push('vm-btn-pressed');
  if (className) classes.push(className);
  return (
    <button
      type={type}
      className={classes.join(' ')}
      aria-pressed={pressed === undefined ? undefined : !!pressed}
      {...rest}
    />
  );
}
