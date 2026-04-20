import { useState }       from 'react';
import { Layout }         from '../components/Layout';
import { RepHome }        from '../components/RepHome';
import { MyDay }          from '../components/MyDay';
import { OrdersView }     from '../components/OrdersView';
import { PaycheckView }   from '../components/PaycheckView';
import { REP_TABS }       from '../config';
import { ArchieChat }     from '../components/ArchieChat';
import { PlaybookView }   from '../components/PlaybookView';

export function RepView({ user, onSignOut }) {
  const [tab, setTab] = useState('home');

  return (
    <Layout user={user} activeTab={tab} tabs={REP_TABS} onTabChange={setTab} onSignOut={onSignOut}>
      {tab === 'home'      && <RepHome user={user} />}
      {tab === 'orders'    && <OrdersView user={user} repFilter={user?.name} />}
      {tab === 'paycheck'  && <PaycheckView user={user} />}
      {tab === 'myday'     && <MyDay user={user} />}
      {tab === 'archie'    && <ArchieChat user={user} />}
      {tab === 'knowledge' && <PlaybookView user={user} />}
    </Layout>
  );
}
