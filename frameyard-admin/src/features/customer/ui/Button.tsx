import React from 'react';
import { Link, type LinkProps } from 'react-router-dom';

import { buttonClass, type ButtonVariant } from './buttonClass';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant };

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className, type = 'button', ...props }) => (
  <button type={type} className={buttonClass(variant, className)} {...props} />
);

type ButtonLinkProps = LinkProps & { variant?: ButtonVariant };

export const ButtonLink: React.FC<ButtonLinkProps> = ({ variant = 'primary', className, ...props }) => (
  <Link className={buttonClass(variant, typeof className === 'string' ? className : '')} {...props} />
);
