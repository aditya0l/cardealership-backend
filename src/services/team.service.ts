import prisma from '../config/db';

/**
 * Recursively resolve all active team member Firebase UIDs reporting (directly or indirectly)
 * to the provided manager. Optionally include the manager's own UID.
 */
export const getTeamMemberIds = async (
  managerId: string,
  includeSelf = false
): Promise<string[]> => {
  const visited = new Set<string>();
  const queue: string[] = [managerId];
  const result: string[] = [];

  while (queue.length > 0) {
    const currentManager = queue.shift()!;

    const subordinates = await prisma.user.findMany({
      where: {
        managerId: currentManager,
        isActive: true
      },
      select: {
        firebaseUid: true
      }
    });

    for (const subordinate of subordinates) {
      const uid = subordinate.firebaseUid;
      if (!visited.has(uid)) {
        visited.add(uid);
        result.push(uid);
        queue.push(uid);
      }
    }
  }

  if (includeSelf) {
    result.unshift(managerId);
  }

  return result;
};

