import { Link } from 'react-router-dom';
import { displayPersonName, personInitials } from '@oggaq/study-core';

export function UserIdentity({ name }: { name: string }) {
  const fullName = displayPersonName(name);
  return <Link to="/account" className="user-identity" aria-label="Hesabım" aria-description={fullName} title={fullName}>
    <span className="person-avatar" data-testid="header-initials" aria-hidden="true">{personInitials(name) || '?'}</span>
    <span className="user-identity-copy"><small>Hesabım</small><strong>{fullName}</strong></span>
  </Link>;
}
