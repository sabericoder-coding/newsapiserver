import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import {
  getListCountriesQueryKey,
  getListCountryNewsQueryKey,
  useListCountries,
  useListCountryNews,
  type Country,
  type NewsItem,
} from '@workspace/api-client-react';

const LAST_COUNTRY_KEY = 'country-pulse:last-country';
function formatPopulation(value: number) {
  if (!value) return 'Population unavailable';
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B people`;
  }
  if (value >= 1_000_000) {
    return `${Math.round(value / 1_000_000)}M people`;
  }
  return `${Math.round(value / 1_000)}K people`;
}

function formatAge(date: string) {
  const timestamp = Date.parse(date);
  if (Number.isNaN(timestamp)) return 'Today';
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}


function CountryChip({
  country,
  selected,
  onPress,
}: {
  country: Country;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      testID={`country-${country.code}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.countryChip,
        {
          backgroundColor: selected ? colors.accent : colors.card,
          borderColor: selected ? colors.accent : colors.border,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      {country.flagUrl ? (
        <Image source={{ uri: country.flagUrl }} style={styles.flag} />
      ) : (
        <View style={[styles.flagFallback, { backgroundColor: colors.muted }]}>
          <Text style={[styles.flagInitial, { color: colors.mutedForeground }]}>
            {country.name.charAt(0)}
          </Text>
        </View>
      )}
      <Text
        numberOfLines={1}
        style={[
          styles.countryChipLabel,
          { color: selected ? colors.accentForeground : colors.foreground },
        ]}
      >
        {country.name}
      </Text>
    </Pressable>
  );
}

function NewsCard({ item, onPress }: { item: NewsItem; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      testID={`news-${item.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.newsCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.76 : 1,
        },
      ]}
    >
      <View style={styles.newsMeta}>
        <Text style={[styles.publisher, { color: colors.primary }]}>
          {item.publisher}
        </Text>
        <Text style={[styles.age, { color: colors.mutedForeground }]}>
          {formatAge(item.publishedAt)}
        </Text>
      </View>
      <Text style={[styles.newsTitle, { color: colors.cardForeground }]}>
        {item.title}
      </Text>
      <View style={styles.readRow}>
        <Text style={[styles.readLabel, { color: colors.mutedForeground }]}>
          Read story
        </Text>
        <Feather name="arrow-up-right" size={15} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [countrySearch, setCountrySearch] = useState('');
  const countriesQuery = useListCountries({
    query: {
      queryKey: getListCountriesQueryKey(),
      staleTime: 60 * 60 * 1000,
    },
  });
  const countries = countriesQuery.data ?? [];
  const countriesLoading = countriesQuery.isLoading;
  const countriesError = countriesQuery.isError
    ? countriesQuery.error instanceof Error
      ? countriesQuery.error.message
      : 'Could not load the country directory.'
    : null;
  const newsQuery = useListCountryNews(
    { country: selectedCountry?.name ?? '' },
    {
      query: {
        queryKey: getListCountryNewsQueryKey({
          country: selectedCountry?.name ?? '',
        }),
        enabled: Boolean(selectedCountry),
        staleTime: 5 * 60 * 1000,
      },
    },
  );
  const news = newsQuery.data ?? [];
  const newsLoading = newsQuery.isLoading || newsQuery.isFetching;
  const newsError = newsQuery.isError
    ? newsQuery.error instanceof Error
      ? newsQuery.error.message
      : 'Could not load headlines for this country.'
    : null;

  useEffect(() => {
    if (!countries.length || selectedCountry) return;
    let active = true;
    void AsyncStorage.getItem(LAST_COUNTRY_KEY).then((savedCode) => {
      if (!active) return;
      setSelectedCountry(
        countries.find((country) => country.code === savedCode) ??
          countries[0] ??
          null,
      );
    });
    return () => {
      active = false;
    };
  }, [countries, selectedCountry]);

  const loadCountries = useCallback(async () => {
    await countriesQuery.refetch();
  }, [countriesQuery]);

  const loadNews = useCallback(async () => {
    await newsQuery.refetch();
  }, [newsQuery]);

  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return countries;
    return countries.filter((country) =>
      country.name.toLowerCase().includes(query),
    );
  }, [countries, countrySearch]);

  const selectCountry = useCallback((country: Country) => {
    void Haptics.selectionAsync();
    setSelectedCountry(country);
    setCountrySearch('');
    void AsyncStorage.setItem(LAST_COUNTRY_KEY, country.code);
  }, []);

  const listHeader = (
    <View>
      <LinearGradient
        colors={[colors.hero, colors.hero]}
        style={[styles.hero, { paddingTop: insets.top + 18 }]}
      >
        <View style={styles.heroTopLine}>
          <View style={styles.brandLockup}>
            <Image
              source={require('../assets/images/icon.png')}
              style={styles.brandMark}
            />
            <View>
              <Text style={[styles.kicker, { color: colors.heroMuted }]}>
                COUNTRY PULSE
              </Text>
              <Text style={[styles.heroTitle, { color: colors.heroForeground }]}>
                World, in motion.
              </Text>
            </View>
          </View>
          <View style={[styles.livePill, { backgroundColor: colors.accent }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.hero }]} />
            <Text style={[styles.liveText, { color: colors.accentForeground }]}>
              LIVE
            </Text>
          </View>
        </View>
        <Text style={[styles.heroDescription, { color: colors.heroMuted }]}>
          Tap a country to get the headlines shaping its day.
        </Text>
      </LinearGradient>

      <View style={styles.directorySection}>
        <View style={styles.sectionHeadingRow}>
          <View>
            <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>
              EXPLORE THE WORLD
            </Text>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {countries.length ? `${countries.length} countries` : 'Countries'}
            </Text>
          </View>
          <Ionicons name="globe-outline" size={24} color={colors.mutedForeground} />
        </View>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            testID="country-search"
            value={countrySearch}
            onChangeText={setCountrySearch}
            placeholder="Find a country"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {countrySearch ? (
            <Pressable
              testID="clear-search"
              onPress={() => setCountrySearch('')}
              hitSlop={10}
            >
              <Feather name="x-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
        {countriesLoading ? (
          <View style={styles.countryLoading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingLabel, { color: colors.mutedForeground }]}>
              Loading every country…
            </Text>
          </View>
        ) : countriesError ? (
          <View
            style={[
              styles.inlineError,
              { backgroundColor: colors.softAccent, borderColor: colors.border },
            ]}
          >
            <Feather name="wifi-off" size={18} color={colors.primary} />
            <Text style={[styles.errorText, { color: colors.foreground }]}>
              {countriesError}
            </Text>
            <Pressable
              testID="retry-countries"
              onPress={() => void loadCountries()}
              style={({ pressed }) => [
                styles.retryButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Text style={[styles.retryLabel, { color: colors.primaryForeground }]}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.countryRail}
          >
            {filteredCountries.map((country) => (
              <CountryChip
                key={country.code}
                country={country}
                selected={country.code === selectedCountry?.code}
                onPress={() => selectCountry(country)}
              />
            ))}
            {!filteredCountries.length ? (
              <Text style={[styles.noResults, { color: colors.mutedForeground }]}>
                No country matches “{countrySearch}”
              </Text>
            ) : null}
          </ScrollView>
        )}
      </View>

      <View
        style={[
          styles.newsHeader,
          { borderTopColor: colors.border, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.newsHeaderText}>
          <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>
            LATEST BRIEFING
          </Text>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {selectedCountry?.name ?? 'Choose a country'}
          </Text>
        </View>
        {selectedCountry ? (
          <View style={[styles.countrySummary, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.summaryCode, { color: colors.secondaryForeground }]}>
              {selectedCountry.code}
            </Text>
            <Text style={[styles.summaryPopulation, { color: colors.mutedForeground }]}>
              {formatPopulation(selectedCountry.population)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  const emptyNews = (
    <View style={styles.emptyNews}>
      {newsLoading ? (
        <>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Scanning the latest dispatches
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.mutedForeground }]}>
            Finding fresh stories from around the world.
          </Text>
        </>
      ) : newsError ? (
        <>
          <View style={[styles.emptyIcon, { backgroundColor: colors.softAccent }]}>
            <Feather name="radio" size={22} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Nothing fresh came through
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.mutedForeground }]}>
            {newsError}
          </Text>
          {selectedCountry ? (
            <Pressable
              testID="retry-news"
              onPress={() => void loadNews()}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Text style={[styles.primaryButtonLabel, { color: colors.primaryForeground }]}>
                Try again
              </Text>
              <Feather name="refresh-cw" size={16} color={colors.primaryForeground} />
            </Pressable>
          ) : null}
        </>
      ) : (
        <>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="map-pin" size={22} color={colors.secondaryForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Pick a country above
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.mutedForeground }]}>
            Your selected country’s news briefing will appear here.
          </Text>
        </>
      )}
    </View>
  );

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          paddingBottom: Platform.OS === 'web' ? 34 : 0,
        },
      ]}
    >
      <FlatList
        testID="news-list"
        data={news}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NewsCard
            item={item}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              void Linking.openURL(item.link);
            }}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyNews}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={newsLoading}
            onRefresh={() => {
              if (selectedCountry) void loadNews();
            }}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { paddingBottom: 28 },
  hero: { paddingHorizontal: 20, paddingBottom: 24 },
  heroTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandMark: { width: 42, height: 42, borderRadius: 13 },
  kicker: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.6 },
  heroTitle: {
    marginTop: 2,
    fontSize: 25,
    lineHeight: 30,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.7,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 99,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  heroDescription: {
    maxWidth: 290,
    marginTop: 18,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Inter_400Regular',
  },
  directorySection: { paddingTop: 25, paddingBottom: 6 },
  sectionHeadingRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionEyebrow: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.6 },
  sectionTitle: {
    marginTop: 5,
    fontSize: 22,
    lineHeight: 27,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.4,
  },
  searchBox: {
    height: 48,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 15,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  countryRail: { gap: 9, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 15 },
  countryChip: {
    minWidth: 122,
    maxWidth: 155,
    height: 49,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 15,
  },
  flag: { width: 26, height: 18, borderRadius: 4 },
  flagFallback: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagInitial: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  countryChipLabel: { flexShrink: 1, fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  countryLoading: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  loadingLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  inlineError: {
    marginHorizontal: 20,
    marginTop: 14,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
  },
  errorText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: 'Inter_500Medium' },
  retryButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  retryLabel: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  noResults: { paddingVertical: 14, fontSize: 13, fontFamily: 'Inter_400Regular' },
  newsHeader: {
    minHeight: 80,
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  newsHeaderText: { flex: 1 },
  countrySummary: {
    alignItems: 'flex-end',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
  },
  summaryCode: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.1 },
  summaryPopulation: { marginTop: 2, fontSize: 10, fontFamily: 'Inter_400Regular' },
  newsCard: {
    marginHorizontal: 20,
    marginTop: 13,
    padding: 16,
    borderWidth: 1,
    borderRadius: 18,
  },
  newsMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  publisher: { flex: 1, fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.2 },
  age: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  newsTitle: {
    marginTop: 10,
    fontSize: 17,
    lineHeight: 23,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.2,
  },
  readRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  emptyNews: {
    minHeight: 260,
    paddingHorizontal: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  emptyTitle: { fontSize: 18, textAlign: 'center', fontFamily: 'Inter_700Bold' },
  emptyDescription: {
    maxWidth: 280,
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  primaryButton: {
    marginTop: 18,
    paddingHorizontal: 17,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 13,
  },
  primaryButtonLabel: { fontSize: 13, fontFamily: 'Inter_700Bold' },
});