/** جمعيةٌ ومعها خدماتُها — ومن الخدمات تُشتقّ الصلاحيّاتُ المعروضة. */
export type CharityRow = { id: string; name: string; services: string[] };

/** عضويّةُ حسابٍ في جمعية: وصولُه فيها وحدَها. */
export type Membership = {
  charityId: string;
  charityName: string;
  isOfficial: boolean;
  isActive: boolean;
  permissions: string[];
  services: string[];
};

export type AccountRow = {
  id: string;
  name: string;
  phone: string;
  title: string;
  memberships: Membership[];
  createdAt: string;
};
