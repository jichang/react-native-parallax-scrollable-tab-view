import * as React from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StyleProp,
  ViewStyle
} from "react-native";

const deviceWidth = Dimensions.get("window").width;

export interface ITab {
  key: string;
  title: string;
}

export type ScrollEventHandler = (
  evt: NativeSyntheticEvent<NativeScrollEvent>
) => void;

export interface IProps {
  activeTabKey: string;
  tabs: ITab[];
  renderTab: (params: { tab: ITab; isActive: boolean }) => JSX.Element;
  onTabChange: (params: { tab: ITab }) => void;
}

export class ScrollableTabView extends React.PureComponent<IProps> {
  onMomentumScrollEnd = ({
    nativeEvent: {
      contentOffset: { x }
    }
  }: NativeSyntheticEvent<NativeScrollEvent>) => {
    let { activeTabKey, tabs } = this.props;
    let page = Math.floor(x / deviceWidth);
    let tab = tabs[page];
    if (tab.key !== activeTabKey) {
      this.props.onTabChange({ tab });
    }
  };

  render() {
    const { activeTabKey, tabs, renderTab } = this.props;

    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollview}
          pagingEnabled={true}
          horizontal
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={this.onMomentumScrollEnd}
        >
          {tabs.map(tab => {
            const isActive = tab.key === activeTabKey;

            return (
              <View style={styles.tab} key={tab.key}>
                {renderTab({
                  isActive,
                  tab
                })}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollview: {
    flex: 1
  },
  tab: {
    flex: 1,
    width: deviceWidth
  }
});
