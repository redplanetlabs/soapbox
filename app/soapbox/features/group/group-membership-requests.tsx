import React, { useMemo } from 'react';
import { FormattedMessage, defineMessages, useIntl } from 'react-intl';

import Account from 'soapbox/components/account';
import { AuthorizeRejectButtons } from 'soapbox/components/authorize-reject-buttons';
import ScrollableList from 'soapbox/components/scrollable-list';
import { Column, HStack, Spinner } from 'soapbox/components/ui';
import { useGroup } from 'soapbox/hooks';
import { useGroupMembershipRequests } from 'soapbox/hooks/api/groups/useGroupMembershipRequests';
import toast from 'soapbox/toast';

import ColumnForbidden from '../ui/components/column-forbidden';

import type { Account as AccountEntity } from 'soapbox/schemas';

type RouteParams = { id: string };

const messages = defineMessages({
  heading: { id: 'column.group_pending_requests', defaultMessage: 'Pending requests' },
  authorizeFail: { id: 'group.group_mod_authorize.fail', defaultMessage: 'Failed to approve @{name}' },
  rejectFail: { id: 'group.group_mod_reject.fail', defaultMessage: 'Failed to reject @{name}' },
});

interface IMembershipRequest {
  account: AccountEntity
  onAuthorize(account: AccountEntity): Promise<unknown>
  onReject(account: AccountEntity): Promise<unknown>
}

const MembershipRequest: React.FC<IMembershipRequest> = ({ account, onAuthorize, onReject }) => {
  if (!account) return null;

  const handleAuthorize = () => onAuthorize(account);
  const handleReject = () => onReject(account);

  return (
    <HStack space={1} alignItems='center' justifyContent='between' className='p-2.5'>
      <div className='w-full'>
        <Account account={account} withRelationship={false} />
      </div>

      <AuthorizeRejectButtons
        onAuthorize={handleAuthorize}
        onReject={handleReject}
      />
    </HStack>
  );
};

interface IGroupMembershipRequests {
  params: RouteParams
}

const GroupMembershipRequests: React.FC<IGroupMembershipRequests> = ({ params }) => {
  const id = params?.id;
  const intl = useIntl();

  const { group } = useGroup(id);

  const {
    accounts: entities,
    isLoading,
    authorize,
    reject,
    isFetching,
  } = useGroupMembershipRequests(id);

  const accounts = useMemo(() => entities, [isFetching]);

  if (!group || !group.relationship || isLoading) {
    return (
      <Column label={intl.formatMessage(messages.heading)}>
        <Spinner />
      </Column>
    );
  }

  if (!group.relationship.role || !['owner', 'admin', 'moderator'].includes(group.relationship.role)) {
    return <ColumnForbidden />;
  }

  async function handleAuthorize(account: AccountEntity) {
    try {
      await authorize(account.id);
    } catch (_e) {
      toast.error(intl.formatMessage(messages.authorizeFail, { name: account.username }));
    }
  }

  async function handleReject(account: AccountEntity) {
    try {
      await reject(account.id);
    } catch (_e) {
      toast.error(intl.formatMessage(messages.rejectFail, { name: account.username }));
    }
  }

  return (
    <Column label={intl.formatMessage(messages.heading)} backHref={`/groups/${id}/manage`}>
      <ScrollableList
        scrollKey='group_membership_requests'
        emptyMessage={<FormattedMessage id='empty_column.group_membership_requests' defaultMessage='There are no pending membership requests for this group.' />}
      >
        {accounts.map((account) => (
          <MembershipRequest
            key={account.id}
            account={account}
            onAuthorize={handleAuthorize}
            onReject={handleReject}
          />
        ))}
      </ScrollableList>
    </Column>
  );
};

export default GroupMembershipRequests;
