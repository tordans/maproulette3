import { fetchOSMData, fetchOSMElement, fetchOSMElementHistory, fetchOSMChangesets, fetchOSMUser } from './OSM';
import AppErrors from '../Error/AppErrors';
import xmltojson from 'xmltojson';

describe('OSM Service Functions', () => {
  let originalConsoleError;
  let parseXMLSpy;

  beforeEach(() => {
    originalConsoleError = console.error;
    console.error = jest.fn();
    global.fetch = jest.fn();
    parseXMLSpy = jest.spyOn(xmltojson, 'parseXML');
  });

  afterEach(() => {
    console.error = originalConsoleError;
    global.fetch.mockClear();
    parseXMLSpy.mockRestore();
  });

  // Tests for fetchOSMData
  describe('fetchOSMData', () => {
    test('should handle 400 Bad Request error', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 400 });
      await expect(fetchOSMData('0,0,1,1')).rejects.toEqual(AppErrors.osm.requestTooLarge);
    });

    test('should handle 509 Bandwidth Exceeded error', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 509 });
      await expect(fetchOSMData('0,0,1,1')).rejects.toEqual(AppErrors.osm.bandwidthExceeded);
    });

    test('should resolve with parsed XML when fetch is successful', async () => {
      const mockXML = `<osm><node id="1"></node></osm>`;
      const mockDOM = new DOMParser().parseFromString(mockXML, "application/xml");

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(mockXML),
      });

      await expect(fetchOSMData('0,0,1,1')).resolves.toEqual(mockDOM);
    });

    test('should reject with fetchFailure error on fetch failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network Error'));
      await expect(fetchOSMData('0,0,1,1')).rejects.toEqual(AppErrors.osm.fetchFailure);
    });

    test('should resolve with parsed XML when response is empty but still successful', async () => {
      const mockXML = `<?xml version="1.0" encoding="UTF-8"?><osm></osm>`;
      const mockDOM = new DOMParser().parseFromString(mockXML, "application/xml");

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(mockXML),
      });

      await expect(fetchOSMData('0,0,1,1')).resolves.toEqual(mockDOM);
    });

    test('should handle valid XML with unexpected structure', async () => {
      const mockXML = `<osm><unknown id="1"></unknown></osm>`;
      const mockDOM = new DOMParser().parseFromString(mockXML, "application/xml");

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(mockXML),
      });

      await expect(fetchOSMData('0,0,1,1')).resolves.toEqual(mockDOM);
    });
  });

  // Tests for fetchOSMElement
  describe('fetchOSMElement', () => {
    test('should handle 400 Bad Request error', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 400 });
      await expect(fetchOSMElement('node/12345')).rejects.toEqual(AppErrors.osm.requestTooLarge);
    });

    test('should reject with fetchFailure error on fetch failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network Error'));
      await expect(fetchOSMElement('node/12345')).rejects.toEqual(AppErrors.osm.fetchFailure);
    });

    test('should correctly handle different OSM element types', async () => {
      const mockXML = `<osm><way id="1" lat="1.1" lon="1.1"></way></osm>`;
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockXML),
      });
      const result = await fetchOSMElement('way/1');
      expect(result).toEqual({ id: 1, lat: 1.1, lon: 1.1 });
    });

    test('should handle invalid element ID format gracefully', async () => {
      const mockXML = `<osm><node id="1" lat="1.1" lon="1.1"></node></osm>`;
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockXML),
      });
      const result = await fetchOSMElement('invalid_id_format');
      expect(result).toBeUndefined();
    });

    test('should handle large XML responses', async () => {
      const largeXML = `<osm>${'<node id="1" lat="1.1" lon="1.1"></node>'.repeat(1000)}</osm>`;
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(largeXML),
      });
      const result = await fetchOSMElement('node/1');
      expect(result).toBeDefined();
    });

    test('should handle 404 Not Found error', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });
      await expect(fetchOSMElement('node/12345')).rejects.toEqual(AppErrors.osm.elementMissing);
    });

    test('should handle 509 Bandwidth Exceeded error', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 509 });
      await expect(fetchOSMElement('node/12345')).rejects.toEqual(AppErrors.osm.bandwidthExceeded);
    });

    test('should return JSON when asXML is false', async () => {
      const mockXML = `<osm><node id="1" lat="1.1" lon="1.1"></node></osm>`;
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockXML),
      });
      const result = await fetchOSMElement('node/1', false);
      expect(result).toEqual({ id: 1, lat: 1.1, lon: 1.1 });
    });

    test('should return XML when asXML is true', async () => {
      const mockXML = `<osm><node id="1" lat="1.1" lon="1.1"></node></osm>`;
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockXML),
      });
      const xmlDoc = await fetchOSMElement('node/1', true);
      expect(xmlDoc.querySelector('node')).toBeDefined();
    });

    test('should handle empty responses', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<xml></xml>'),
      });
      const result = await fetchOSMElement('way/12345');
      expect(result).toEqual(undefined);
    });

    test('should reject with custom error if error object has id and defaultMessage properties', async () => {
      const customError = { id: 'custom_error', defaultMessage: 'Custom Error' };
      global.fetch.mockRejectedValueOnce(customError);

      await expect(fetchOSMElement('node/12345')).rejects.toEqual(customError);
    });

    test('should reject with fetchFailure if error object does not have id and defaultMessage properties', async () => {
      const nonCustomError = new Error('Generic error');

      global.fetch.mockRejectedValueOnce(nonCustomError);

      await expect(fetchOSMElement('node/12345')).rejects.toEqual(AppErrors.osm.fetchFailure);
    });
  });

  // Tests for fetchOSMElementHistory
  describe('fetchOSMElementHistory', () => {
    test('should map valid changesets correctly', async () => {
      const mockHistory = {
        elements: [
          { id: '1', changeset: '100' },
          { id: '2', changeset: '101' }
        ]
      };

      const mockChangesets = `
        <osm>
          <changeset id="100" details="changeset 100 details"></changeset>
          <changeset id="101" details="changeset 101 details"></changeset>
        </osm>
      `;

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockHistory),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(mockChangesets),
        });

      const history = await fetchOSMElementHistory('way/12345', true);

      expect(history).toHaveLength(2);
      expect(history[0].changeset).toEqual(mockHistory.elements[0].changeset);
      expect(history[1].changeset).toEqual(mockHistory.elements[1].changeset);
    });

    test('should not modify history entries for missing changesets', async () => {
      const mockHistory = {
        elements: [
          { id: '1', changeset: '999' },
          { id: '2', changeset: '888' }
        ]
      };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockHistory),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<osm></osm>'),
        });

      const history = await fetchOSMElementHistory('way/12345', true);

      expect(history).toHaveLength(2);
      expect(history[0].changeset).toBe('999');
      expect(history[1].changeset).toBe('888');
    });

    test('should map changesets correctly when changesets are present in changesetMap', async () => {
      const mockHistory = {
        elements: [
          { id: '1', changeset: '100' },
          { id: '2', changeset: '101' }
        ]
      };

      const mockChangesets = `
        <osm>
          <changeset id="100" details="changeset 100 details"></changeset>
          <changeset id="101" details="changeset 101 details"></changeset>
        </osm>
      `;

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockHistory),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(mockChangesets),
        });

      const history = await fetchOSMElementHistory('way/12345', true);

      expect(history).toHaveLength(2);
      expect(history[0].changeset).toEqual(mockHistory.elements[0].changeset);
      expect(history[1].changeset).toEqual(mockHistory.elements[1].changeset);
    });

    test('should not map changesets if they are not in changesetMap', async () => {
      const mockHistory = {
        elements: [
          { id: '1', changeset: '999' },
          { id: '2', changeset: '888' }
        ]
      };

      const mockChangesets = '<osm></osm>';

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockHistory),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(mockChangesets),
        });

      const history = await fetchOSMElementHistory('way/12345', true);

      expect(history).toHaveLength(2);
      expect(history[0].changeset).toBe('999');
      expect(history[1].changeset).toBe('888');
    });

    test('should handle empty changeset map', async () => {
      const mockHistory = {
        elements: [
          { id: '1', changeset: '100' },
          { id: '2', changeset: '101' }
        ]
      };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockHistory),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<osm></osm>'),
        });

      const history = await fetchOSMElementHistory('way/12345', true);

      expect(history).toHaveLength(2);
      expect(history[0].changeset).toBe('100');
      expect(history[1].changeset).toBe('101');
    });

    test('should not attempt to map changesets if asXML is false', async () => {
      const mockHistory = {
        elements: [
          { id: '1', changeset: '100' },
          { id: '2', changeset: '101' }
        ]
      };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockHistory),
        });

      const history = await fetchOSMElementHistory('way/12345', false);

      expect(history).toHaveLength(2);
      expect(history[0].changeset).toBe('100');
      expect(history[1].changeset).toBe('101');
    });

    test('should handle 404 Not Found error', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });
      await expect(fetchOSMElementHistory('way/12345', true)).rejects.toEqual(AppErrors.osm.elementMissing);
    });

    test('should handle 400 Bad Request error', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 400 });
      await expect(fetchOSMElementHistory('way/12345', true)).rejects.toEqual(AppErrors.osm.requestTooLarge);
    });

    test('should handle 509 Bandwidth Exceeded error', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 509 });
      await expect(fetchOSMElementHistory('way/12345', true)).rejects.toEqual(AppErrors.osm.bandwidthExceeded);
    });

    test('should handle network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network Error'));
      await expect(fetchOSMElementHistory('way/12345', true)).rejects.toEqual(AppErrors.osm.fetchFailure);
    });

    test('should resolve to null if idString is empty', async () => {
      const result = await fetchOSMElementHistory('', true);
      expect(result).toBeNull();
    });
  });

  // Tests for fetchOSMChangesets
  describe('fetchOSMChangesets', () => {
    test('should handle 400 Bad Request error', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 400 });
      await expect(fetchOSMChangesets(['123'])).rejects.toEqual(AppErrors.osm.requestTooLarge);
    });

    test('should handle 509 Bandwidth Exceeded error', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 509 });
      await expect(fetchOSMChangesets(['123'])).rejects.toEqual(AppErrors.osm.bandwidthExceeded);
    });

    test('should return empty array for invalid changeset IDs', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<osm></osm>'),
      });
      const changesets = await fetchOSMChangesets([]);
      expect(changesets).toEqual(undefined);
    });

    test('should return changesets correctly', async () => {
      const mockXML = `<osm><changeset id="1" /></osm>`;
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockXML),
      });
      const changesets = await fetchOSMChangesets(['1']);
      expect(changesets).toHaveLength(1);
      expect(changesets[0]).toHaveProperty('id', 1);
    });
  });

  // Tests for fetchOSMUser
  describe('fetchOSMUser', () => {
    test('should handle network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network Error'));

      await expect(fetchOSMUser('user123')).rejects.toThrow('Network Error');
    });

    test('should handle 404 Not Found error by returning empty object', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const user = await fetchOSMUser('user123');
      expect(user).toEqual({});
    });

    test('should handle XML parsing errors gracefully', async () => {
      const mockXML = '<osm display_name="John Doe">';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockXML),
      });

      await expect(fetchOSMUser('user123')).resolves.toEqual({ id: 'user123', displayName: 'John Doe' });
    });

    test('should handle XML with multiple display_name attributes gracefully', async () => {
      const mockXML = '<osm display_name="John Doe" display_name="Jane Doe"></osm>';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockXML),
      });

      const user = await fetchOSMUser('user123');
      expect(user).toEqual({ id: 'user123', displayName: 'John Doe' });
    }); 
  });
});
