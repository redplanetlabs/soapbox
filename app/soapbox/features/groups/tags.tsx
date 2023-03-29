import clsx from 'clsx';
import React, { useCallback, useState } from 'react';
import { Components, Virtuoso, VirtuosoGrid } from 'react-virtuoso';

import { Column, HStack, Icon } from 'soapbox/components/ui';
import { useGroupsFromTag } from 'soapbox/hooks/api';

import GroupGridItem from './components/discover/group-grid-item';
import GroupListItem from './components/discover/group-list-item';

import type { Group } from 'soapbox/schemas';

enum Layout {
  LIST = 'LIST',
  GRID = 'GRID'
}

const GridList: Components['List'] = React.forwardRef((props, ref) => {
  const { context, ...rest } = props;
  return <div ref={ref} {...rest} className='flex flex-wrap' />;
});

interface ITags {
  params: { id: string }
}

const Tags: React.FC<ITags> = (props) => {
  const tagId = props.params.id;

  const [layout, setLayout] = useState<Layout>(Layout.LIST);

  const { groups, hasNextPage, fetchNextPage } = useGroupsFromTag(tagId);

  const handleLoadMore = () => {
    if (hasNextPage) {
      fetchNextPage();
    }
  };

  const renderGroupList = useCallback((group: Group, index: number) => (
    <div
      className={
        clsx({
          'pt-4': index !== 0,
        })
      }
    >
      <GroupListItem group={group} withJoinAction />
    </div>
  ), []);

  const renderGroupGrid = useCallback((group: Group, index: number) => (
    <div className='pb-4'>
      <GroupGridItem group={group} />
    </div>
  ), []);

  return (
    <Column
      label={`#${tagId}`}
      action={
        <HStack alignItems='center'>
          <button onClick={() => setLayout(Layout.LIST)}>
            <Icon
              src={require('@tabler/icons/layout-list.svg')}
              className={
                clsx('h-5 w-5 text-gray-600', {
                  'text-primary-600': layout === Layout.LIST,
                })
              }
            />
          </button>

          <button onClick={() => setLayout(Layout.GRID)}>
            <Icon
              src={require('@tabler/icons/layout-grid.svg')}
              className={
                clsx('h-5 w-5 text-gray-600', {
                  'text-primary-600': layout === Layout.GRID,
                })
              }
            />
          </button>
        </HStack>
      }
    >
      {layout === Layout.LIST ? (
        <Virtuoso
          useWindowScroll
          data={groups}
          itemContent={(index, group) => renderGroupList(group, index)}
          endReached={handleLoadMore}
        />
      ) : (
        <VirtuosoGrid
          useWindowScroll
          data={groups}
          itemContent={(index, group) => renderGroupGrid(group, index)}
          components={{
            Item: (props) => (
              <div {...props} className='w-1/2 flex-none' />
            ),
            List: GridList,
          }}
          endReached={handleLoadMore}
        />
      )}
    </Column>
  );
};

export default Tags;
