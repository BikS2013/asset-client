import { AssetClient } from '../src/core/AssetClient';
import { AssetNotFoundError } from '../src/types';
import { Pool } from 'pg';

jest.mock('pg');

describe('AssetClient', () => {
  let assetClient: AssetClient;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      end: jest.fn().mockResolvedValue(undefined),
    };
    
    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool);
    
    assetClient = new AssetClient({
      connectionString: 'postgresql://test:test@localhost:5432/test',
      userKey: 'test-app',
    });
  });

  afterEach(async () => {
    await assetClient.close();
  });

  describe('getAsset', () => {
    it('should create registration for new asset', async () => {
      const masterAsset = {
        id: 'master-id',
        created_at: new Date(),
        user_key: null,
        asset_registry: 'github.com/test/repo',
        asset_key: 'config.json',
        asset_class: 'config',
        asset_type: 'json',
        description: 'Test config',
        data: '{"test": true}',
        data_hash: 'abc123',
        registry_commit: 'commit123',
        registry_commit_url: 'https://github.com/test/repo/commit/commit123',
      };

      const newAsset = { ...masterAsset, id: 'new-id', user_key: 'test-app' };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Check registered
        .mockResolvedValueOnce({ rows: [masterAsset] }) // Get master
        .mockResolvedValueOnce({ rows: [newAsset] }) // Create registration
        .mockResolvedValueOnce({ rows: [] }) // Log retrieval
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await assetClient.getAsset('github.com/test/repo', 'config.json');

      expect(result).toBe('{"test": true}');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should return existing registration when up to date', async () => {
      const registeredAsset = {
        id: 'registered-id',
        created_at: new Date(),
        user_key: 'test-app',
        asset_registry: 'github.com/test/repo',
        asset_key: 'config.json',
        asset_class: 'config',
        asset_type: 'json',
        description: 'Test config',
        data: '{"test": true}',
        data_hash: 'abc123',
        registry_commit: 'commit123',
        registry_commit_url: 'https://github.com/test/repo/commit/commit123',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [registeredAsset] }) // Check registered
        .mockResolvedValueOnce({ rows: [registeredAsset] }) // Get master (same hash)
        .mockResolvedValueOnce({ rows: [] }) // Log retrieval
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await assetClient.getAsset('github.com/test/repo', 'config.json');

      expect(result).toBe('{"test": true}');
    });

    it('should update registration when master has changed', async () => {
      const oldAsset = {
        id: 'registered-id',
        created_at: new Date('2023-01-01'),
        user_key: 'test-app',
        asset_registry: 'github.com/test/repo',
        asset_key: 'config.json',
        asset_class: 'config',
        asset_type: 'json',
        description: 'Old config',
        data: '{"test": false}',
        data_hash: 'old-hash',
        registry_commit: 'old-commit',
        registry_commit_url: 'https://github.com/test/repo/commit/old-commit',
      };

      const newMaster = {
        ...oldAsset,
        user_key: null,
        description: 'New config',
        data: '{"test": true}',
        data_hash: 'new-hash',
        registry_commit: 'new-commit',
        registry_commit_url: 'https://github.com/test/repo/commit/new-commit',
      };

      const updatedAsset = {
        ...oldAsset,
        ...newMaster,
        user_key: 'test-app',
        created_at: new Date(),
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [oldAsset] }) // Check registered
        .mockResolvedValueOnce({ rows: [newMaster] }) // Get master
        .mockResolvedValueOnce({ rows: [] }) // Archive to log
        .mockResolvedValueOnce({ rows: [updatedAsset] }) // Update registration
        .mockResolvedValueOnce({ rows: [] }) // Log retrieval
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await assetClient.getAsset('github.com/test/repo', 'config.json');

      expect(result).toBe('{"test": true}');
    });

    it('should throw AssetNotFoundError when asset does not exist', async () => {
      // Create client with no retries for this test
      const noRetryClient = new AssetClient({
        connectionString: 'postgresql://test:test@localhost:5432/test',
        userKey: 'test-app',
        maxRetries: 1, // No retries
      });

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Check registered
        .mockResolvedValueOnce({ rows: [] }) // Get master (not found)
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        noRetryClient.getAsset('github.com/test/repo', 'missing.json')
      ).rejects.toThrow(AssetNotFoundError);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      
      await noRetryClient.close();
    });

    it('should retry on transient failures', async () => {
      const masterAsset = {
        id: 'master-id',
        created_at: new Date(),
        user_key: null,
        asset_registry: 'github.com/test/repo',
        asset_key: 'config.json',
        asset_class: 'config',
        asset_type: 'json',
        description: 'Test config',
        data: '{"test": true}',
        data_hash: 'abc123',
        registry_commit: 'commit123',
        registry_commit_url: 'https://github.com/test/repo/commit/commit123',
      };

      // First attempt fails
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Check registered
        .mockRejectedValueOnce(new Error('Connection timeout')) // Fails during master query
        .mockResolvedValueOnce({}); // ROLLBACK

      // Second attempt succeeds
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Check registered
        .mockResolvedValueOnce({ rows: [masterAsset] }) // Get master
        .mockResolvedValueOnce({ rows: [{ ...masterAsset, user_key: 'test-app' }] }) // Create
        .mockResolvedValueOnce({}) // Log retrieval
        .mockResolvedValueOnce({}); // COMMIT

      const client = new AssetClient({
        connectionString: 'postgresql://test:test@localhost:5432/test',
        userKey: 'test-app',
        maxRetries: 2,
        retryDelay: 10,
      });

      const result = await client.getAsset('github.com/test/repo', 'config.json');
      expect(result).toBe('{"test": true}');
      
      await client.close();
    });
  });
});