import {
    OrganizationMemberRole,
    type OrganizationMemberProfile,
} from '../types/organizationMemberProfile';

export const ORGANIZATION_MEMBER: OrganizationMemberProfile = {
    userUuid: '123',
    organizationUuid: '456',
    role: OrganizationMemberRole.MEMBER,
    firstName: 'jane',
    lastName: 'jackson',
    email: 'jane@gmail.com',
    isActive: true,
};

export const ORGANIZATION_VIEWER: OrganizationMemberProfile = {
    ...ORGANIZATION_MEMBER,
    role: OrganizationMemberRole.VIEWER,
};
export const ORGANIZATION_INTERACTIVE_VIEWER: OrganizationMemberProfile = {
    ...ORGANIZATION_MEMBER,
    role: OrganizationMemberRole.INTERACTIVE_VIEWER,
};
export const ORGANIZATION_EDITOR: OrganizationMemberProfile = {
    ...ORGANIZATION_MEMBER,
    role: OrganizationMemberRole.EDITOR,
};
export const ORGANIZATION_DEVELOPER: OrganizationMemberProfile = {
    ...ORGANIZATION_MEMBER,
    role: OrganizationMemberRole.DEVELOPER,
};

export const ORGANIZATION_ADMIN: OrganizationMemberProfile = {
    ...ORGANIZATION_MEMBER,
    role: OrganizationMemberRole.ADMIN,
};
