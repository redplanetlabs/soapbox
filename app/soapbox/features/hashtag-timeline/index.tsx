import React, { useEffect, useRef } from 'react';
import { useIntl, defineMessages, FormattedMessage } from 'react-intl';

import { connectHashtagStream } from 'soapbox/actions/streaming';
import { fetchHashtag, followHashtag, unfollowHashtag } from 'soapbox/actions/tags';
import { expandHashtagTimeline, clearTimeline } from 'soapbox/actions/timelines';
import List, { ListItem } from 'soapbox/components/list';
import { Column, Toggle } from 'soapbox/components/ui';
import Timeline from 'soapbox/features/ui/components/timeline';
import { useAppDispatch, useAppSelector, useFeatures } from 'soapbox/hooks';

import type { Tag as TagEntity } from 'soapbox/types/entities';

type Mode = 'any' | 'all' | 'none';

type Tag = { value: string };
type Tags = { [k in Mode]: Tag[] };

const messages = defineMessages({
  any: { id: 'hashtag.column_header.tag_mode.any', defaultMessage: 'or {additional}' },
  all: { id: 'hashtag.column_header.tag_mode.all', defaultMessage: 'and {additional}' },
  none: { id: 'hashtag.column_header.tag_mode.none', defaultMessage: 'without {additional}' },
  empty: { id: 'empty_column.hashtag', defaultMessage: 'There is nothing in this hashtag yet.' },
});

interface IHashtagTimeline {
  params?: {
    id?: string
    tags?: Tags
  }
}

export const HashtagTimeline: React.FC<IHashtagTimeline> = ({ params }) => {
  const intl = useIntl();
  const id = params?.id || '';
  const tags = params?.tags || { any: [], all: [], none: [] };
  
  const features = useFeatures();
  const dispatch = useAppDispatch();
  const disconnects = useRef<(() => void)[]>([]);
  const tag = useAppSelector((state) => state.tags.get(id));
  const next = useAppSelector(state => state.timelines.get(`hashtag:${id}`)?.next);

  // Mastodon supports displaying results from multiple hashtags.
  // https://github.com/mastodon/mastodon/issues/6359
  const title = (): string => {
    const title: string[] = [`#${id}`];

    if (additionalFor('any')) {
      title.push(' ', intl.formatMessage(messages.any, { additional: additionalFor('any') }));
    }

    if (additionalFor('all')) {
      title.push(' ', intl.formatMessage(messages.any, { additional: additionalFor('all') }));
    }

    if (additionalFor('none')) {
      title.push(' ', intl.formatMessage(messages.any, { additional: additionalFor('none') }));
    }

    return title.join('');
  };

  const additionalFor = (mode: Mode) => {
    if (tags && (tags[mode] || []).length > 0) {
      return tags[mode].map(tag => tag.value).join('/');
    } else {
      return '';
    }
  };

  const subscribe = () => {
    const any  = tags.any.map(tag => tag.value);
    const all  = tags.all.map(tag => tag.value);
    const none = tags.none.map(tag => tag.value);

    [id, ...any].map(tag => {
      disconnects.current.push(dispatch(connectHashtagStream(id, tag, status => {
        const tags = status.tags.map((tag: TagEntity) => tag.name);

        return all.filter(tag => tags.includes(tag)).length === all.length &&
               none.filter(tag => tags.includes(tag)).length === 0;
      })));
    });
  };

  const unsubscribe = () => {
    disconnects.current.map(disconnect => disconnect());
    disconnects.current = [];
  };

  const handleLoadMore = (maxId: string) => {
    dispatch(expandHashtagTimeline(id, { url: next, maxId, tags }));
  };

  const handleFollow = () => {
    if (tag?.following) {
      dispatch(unfollowHashtag(id));
    } else {
      dispatch(followHashtag(id));
    }
  };

  useEffect(() => {
    subscribe();
    dispatch(expandHashtagTimeline(id, { tags }));
    dispatch(fetchHashtag(id));

    return () => {
      unsubscribe();
    };
  }, [id]);

  useEffect(() => {
    unsubscribe();
    subscribe();
    dispatch(clearTimeline(`hashtag:${id}`));
    dispatch(expandHashtagTimeline(id, { tags }));
  }, [id]);

  return (
    <Column bodyClassName='space-y-3' label={title()} transparent>
      {features.followHashtags && (
        <List>
          <ListItem
            label={<FormattedMessage id='hashtag.follow' defaultMessage='Follow hashtag' />}
          >
            <Toggle
              checked={tag?.following}
              onChange={handleFollow}
            />
          </ListItem>
        </List>
      )}
      <Timeline
        scrollKey='hashtag_timeline'
        timelineId={`hashtag:${id}`}
        onLoadMore={handleLoadMore}
        emptyMessage={intl.formatMessage(messages.empty)}
        divideType='space'
      />
    </Column>
  );
};

export default HashtagTimeline;
